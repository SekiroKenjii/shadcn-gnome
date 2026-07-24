#!/usr/bin/env bash
# lib/gdm-theme-setup.sh: root helper that themes the GDM login screen (greeter)
# by rebuilding the GNOME Shell theme gresource with an appended CSS fragment.
#
# SAFETY MODEL (a broken greeter can stop graphical login, so treat with care):
#   * Everything is built and VALIDATED in a tempdir; the live gresource is only
#     swapped AFTER validation passes (resource count matches the base + our
#     marker is present). On any failure we abort and touch nothing.
#   * Debian/Ubuntu: GDM's theme gresource is managed by `update-alternatives`
#     (gdm-theme.gresource / gdm3-theme.gresource). We register ours as a
#     high-priority alternative, so removing it makes the OS auto-revert to the
#     distro theme. This is reversible and the safest option.
#   * Fedora/other: no such alternative, so we back up the stock
#     gnome-shell-theme.gresource ONCE, then replace it; uninstall restores it.
#   * We NEVER restart GDM (that would kill the running session) and NEVER touch
#     the GDM dconf profile (wiping it drops the greeter's session-name and
#     breaks login, a known failure mode).
#
# Usage:
#   gdm-theme-setup.sh install   <theme-name> <css-fragment-file>
#   gdm-theme-setup.sh uninstall [theme-name]
set -euo pipefail

log()  { printf '\033[34m::\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31mxx\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "must run as root (use sudo)"

ACTION="${1:-}"
THEME="${2:-}"
FRAG="${3:-}"

STORE=/usr/share/gnome-shell/theme/shadcn-gdm          # where our built gresources live
STOCK=/usr/share/gnome-shell/gnome-shell-theme.gresource
BACKUP="$STOCK.shadcn-backup"
PRIO=200

# name of the update-alternatives entry for the GDM theme, or "" if unmanaged
alt_name() {
  local n
  for n in gdm-theme.gresource gdm3-theme.gresource; do
    update-alternatives --query "$n" >/dev/null 2>&1 && { echo "$n"; return 0; }
  done
  echo ""
}
alt_link() { update-alternatives --query "$1" 2>/dev/null | awk -F': ' '/^Link:/{print $2; exit}'; }

# pick the distro BASE gresource to extend (never one of ours, to avoid stacking)
pick_base() {
  local alt="$1" cur c
  # replace-mode re-run: the original was saved as $BACKUP, so build from
  # THAT, never from the already-themed live file (which would compound).
  [ -f "$BACKUP" ] && { echo "$BACKUP"; return 0; }
  if [ -n "$alt" ]; then
    cur="$(alt_link "$alt")"
    cur="$(readlink -f "$cur" 2>/dev/null || true)"
    case "$cur" in "$STORE"/*) cur="" ;; esac
    [ -n "$cur" ] && [ -f "$cur" ] && { echo "$cur"; return 0; }
  fi
  for c in /usr/share/gnome-shell/theme/Yaru/gnome-shell-theme.gresource "$STOCK"; do
    [ -f "$c" ] && { echo "$c"; return 0; }
  done
  return 1
}

# build_ours <base-gresource> <fragment> <out-gresource>
build_ours() {
  local base="$1" frag="$2" out="$3"
  command -v gresource >/dev/null || die "missing 'gresource' (glib2 / libglib2.0-bin)"
  command -v glib-compile-resources >/dev/null || die "missing 'glib-compile-resources' (glib2-devel / libgio-2.0-dev-bin)"
  [ -f "$frag" ] || die "css fragment not found: $frag"

  local tmp; tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  local paths; paths="$(gresource list "$base" 2>/dev/null)" || return 1
  [ -n "$paths" ] || return 1

  local xml="$tmp/build.gresource.xml"
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<gresources>\n  <gresource prefix="/org/gnome/shell/theme">\n' > "$xml"

  local p rel n=0
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    case "$p" in
      /org/gnome/shell/theme/*) : ;;
      *) warn "unexpected resource path ($p); aborting for safety"; return 1 ;;
    esac
    rel="${p#/org/gnome/shell/theme/}"
    mkdir -p "$tmp/$(dirname "$rel")"
    gresource extract "$base" "$p" > "$tmp/$rel" 2>/dev/null || return 1
    printf '    <file>%s</file>\n' "$rel" >> "$xml"
    n=$((n + 1))
  done <<< "$paths"
  printf '  </gresource>\n</gresources>\n' >> "$xml"
  [ "$n" -gt 0 ] || return 1

  # append our fragment to the greeter styles: gdm.css (login dialog) + the dark
  # shell stylesheet (panel etc.). Not high-contrast (leave a11y untouched).
  local cand appended=0
  for cand in gdm.css Yaru/gnome-shell-dark.css gnome-shell-dark.css; do
    if [ -f "$tmp/$cand" ]; then
      { printf '\n/* shadcn-gdm:%s begin */\n' "$THEME"; cat "$frag"; printf '\n/* shadcn-gdm:%s end */\n' "$THEME"; } >> "$tmp/$cand"
      appended=1
    fi
  done
  [ "$appended" = 1 ] || { warn "no greeter stylesheet (gdm.css / gnome-shell-dark.css) in base"; return 1; }

  glib-compile-resources --sourcedir="$tmp" --target="$out" "$xml" 2>/dev/null || return 1
  return 0
}

# validate <our-gresource> <base-gresource>
validate() {
  local our="$1" base="$2" cbase cour
  [ -s "$our" ] || { warn "built gresource is empty"; return 1; }
  gresource list "$our" >/dev/null 2>&1 || { warn "built gresource is unreadable"; return 1; }
  cbase="$(gresource list "$base" 2>/dev/null | grep -c . || true)"
  cour="$(gresource list "$our" 2>/dev/null | grep -c . || true)"
  [ "$cour" = "$cbase" ] || { warn "resource count changed ($cbase -> $cour); aborting"; return 1; }
  gresource list "$our" | grep -q '/org/gnome/shell/theme/gdm.css' \
    || { warn "gdm.css missing from built gresource"; return 1; }
  gresource extract "$our" /org/gnome/shell/theme/gdm.css 2>/dev/null | grep -q "shadcn-gdm:$THEME" \
    || { warn "our marker missing from built gresource"; return 1; }
  return 0
}

do_install() {
  [ -n "$THEME" ] || die "usage: $0 install <theme-name> <css-fragment-file>"
  [ -n "$FRAG" ]  || die "usage: $0 install <theme-name> <css-fragment-file>"

  local alt base out tmpout
  alt="$(alt_name)"
  base="$(pick_base "$alt")" || die "no base GNOME Shell theme gresource found"
  log "GDM base gresource: $base"

  mkdir -p "$STORE"
  out="$STORE/$THEME.gresource"
  tmpout="$(mktemp --suffix=.gresource)"

  log "building themed gresource (in tempdir)…"
  build_ours "$base" "$FRAG" "$tmpout" || { rm -f "$tmpout"; die "build failed; nothing changed"; }
  log "validating…"
  validate "$tmpout" "$base"           || { rm -f "$tmpout"; die "validation failed; nothing changed"; }

  install -Dm644 "$tmpout" "$out"; rm -f "$tmpout"
  log "installed built gresource: $out"

  if [ -n "$alt" ]; then
    local link; link="$(alt_link "$alt")"
    log "registering via update-alternatives ($alt, prio $PRIO); reversible"
    update-alternatives --install "$link" "$alt" "$out" "$PRIO" >/dev/null
    update-alternatives --set "$alt" "$out" >/dev/null
    log "GDM theme set to '$THEME'. Revert anytime: sudo update-alternatives --remove $alt $out"
  else
    # replace mode (Fedora/other): back up the stock gresource ONCE, then swap.
    [ -f "$STOCK" ] || die "stock gresource $STOCK not found; refusing to guess"
    [ -f "$BACKUP" ] || { cp -a "$STOCK" "$BACKUP"; log "backed up stock gresource -> $BACKUP"; }
    cp -a "$out" "$STOCK"
    log "replaced $STOCK (backup at $BACKUP). Revert: sudo $0 uninstall"
  fi

  log "done. The change appears on the NEXT login/lock screen (no GDM restart)."
}

do_uninstall() {
  local alt removed=0
  alt="$(alt_name)"
  if [ -n "$alt" ]; then
    # remove every alternative that points into our store, then let it auto-revert
    local line path
    while IFS= read -r line; do
      case "$line" in
        "Alternative: $STORE"/*)
          path="${line#Alternative: }"
          update-alternatives --remove "$alt" "$path" >/dev/null 2>&1 && { log "removed alternative: $path"; removed=1; } ;;
      esac
    done < <(update-alternatives --query "$alt" 2>/dev/null)
    update-alternatives --auto "$alt" >/dev/null 2>&1 || true
  fi
  # replace-mode restore
  if [ -f "$BACKUP" ]; then
    cp -a "$BACKUP" "$STOCK"; rm -f "$BACKUP"
    log "restored stock gresource from backup"; removed=1
  fi
  rm -rf "$STORE"
  [ "$removed" = 1 ] && log "GDM theming removed; distro greeter restored on next login." \
                     || log "no shadcn GDM theming was installed."
}

case "$ACTION" in
  install)   do_install ;;
  uninstall) do_uninstall ;;
  *) die "usage: $0 {install <theme> <css>|uninstall [theme]}" ;;
esac
