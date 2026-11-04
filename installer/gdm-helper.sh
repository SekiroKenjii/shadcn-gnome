#!/usr/bin/env bash
# Root helper that themes the GDM greeter by rebuilding the GNOME Shell theme
# gresource with the shadcn fragment appended.
#
# Safety model (a broken greeter can block graphical login):
#   * The gresource is built and validated in a temporary directory; the live
#     file is only swapped after validation, otherwise nothing changes.
#   * Debian/Ubuntu manage the greeter gresource with update-alternatives, so
#     ours is registered as a high-priority alternative and removal auto-reverts.
#   * Elsewhere the stock gresource is backed up once and restored on uninstall.
#   * GDM is never restarted and its dconf profile is only ever extended:
#     replacing it drops the greeter defaults (session name) and breaks login.
#
# Usage:
#   gdm-helper.sh install --theme NAME --scheme dark|light \
#       --fragment-dark FILE --fragment-light FILE [--font "Geist 11"] \
#       [--cursor-theme DIR] [--icon-theme DIR ...] [--font-dir DIR]
#   gdm-helper.sh uninstall
#   gdm-helper.sh build --base GRESOURCE --out FILE --fragment-dark FILE --fragment-light FILE [--theme NAME]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=installer/lib/log.sh
source "$HERE/lib/log.sh"

readonly STORE=/usr/share/gnome-shell/theme/shadcn-gdm
readonly STOCK=/usr/share/gnome-shell/gnome-shell-theme.gresource
readonly BACKUP="$STOCK.shadcn-backup"
readonly SHARED_ASSETS=/usr/local/share
readonly MANIFEST="$STORE/installed-assets.list"
readonly DCONF_KEYFILE=/etc/dconf/db/gdm.d/07-shadcn-gnome
readonly LEGACY_DCONF_KEYFILE=/etc/dconf/db/gdm.d/07-shadcn-accent
readonly ALTERNATIVE_PRIORITY=200
readonly HIGH_CONTRAST_SUFFIX=high-contrast

THEME=""
SCHEME=dark
FRAGMENT_DARK=""
FRAGMENT_LIGHT=""
FONT=""
CURSOR_THEME=""
ICON_THEMES=()
FONT_DIR=""
BASE=""
OUT=""

parse_options() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --theme) THEME="$2"; shift 2 ;;
      --scheme) SCHEME="$2"; shift 2 ;;
      --fragment-dark) FRAGMENT_DARK="$2"; shift 2 ;;
      --fragment-light) FRAGMENT_LIGHT="$2"; shift 2 ;;
      --font) FONT="$2"; shift 2 ;;
      --cursor-theme) CURSOR_THEME="$2"; shift 2 ;;
      --icon-theme) ICON_THEMES+=("$2"); shift 2 ;;
      --font-dir) FONT_DIR="$2"; shift 2 ;;
      --base) BASE="$2"; shift 2 ;;
      --out) OUT="$2"; shift 2 ;;
      *) die "unknown option: $1" ;;
    esac
  done
  case "$SCHEME" in dark | light) ;; *) die "--scheme must be dark or light" ;; esac
}

alternative_name() {
  local name
  for name in gdm-theme.gresource gdm3-theme.gresource; do
    update-alternatives --query "$name" >/dev/null 2>&1 && { echo "$name"; return 0; }
  done
  echo ""
}

alternative_link() {
  update-alternatives --query "$1" 2>/dev/null | awk -F': ' '/^Link:/ { print $2; exit }'
}

# The distro gresource to extend, never one of ours (that would stack fragments).
pick_base_gresource() {
  local alternative="$1" current candidate
  [ -f "$BACKUP" ] && { echo "$BACKUP"; return 0; }
  if [ -n "$alternative" ]; then
    current="$(readlink -f "$(alternative_link "$alternative")" 2>/dev/null || true)"
    case "$current" in "$STORE"/*) current="" ;; esac
    [ -n "$current" ] && [ -f "$current" ] && { echo "$current"; return 0; }
  fi
  for candidate in /usr/share/gnome-shell/theme/Yaru/gnome-shell-theme.gresource "$STOCK"; do
    [ -f "$candidate" ] && { echo "$candidate"; return 0; }
  done
  return 1
}

fragment_for_stylesheet() {
  case "$1" in
    *-"$HIGH_CONTRAST_SUFFIX".css) echo "" ;;
    *-light.css) echo "$FRAGMENT_LIGHT" ;;
    *.css) echo "$FRAGMENT_DARK" ;;
    *) echo "" ;;
  esac
}

build_gresource() {
  local base="$1" out="$2" workdir status
  require_tools gresource glib-compile-resources
  [ -f "$FRAGMENT_DARK" ] || die "dark fragment not found: $FRAGMENT_DARK"
  [ -f "$FRAGMENT_LIGHT" ] || die "light fragment not found: $FRAGMENT_LIGHT"
  workdir="$(mktemp -d)"
  status=0
  assemble_gresource "$base" "$out" "$workdir" || status=$?
  rm -rf "$workdir"
  return "$status"
}

assemble_gresource() {
  local base="$1" out="$2" workdir="$3" resources resource relative manifest fragment themed=0
  resources="$(gresource list "$base" 2>/dev/null)" || return 1
  [ -n "$resources" ] || return 1
  manifest="$workdir/theme.gresource.xml"
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<gresources>\n  <gresource prefix="/org/gnome/shell/theme">\n' > "$manifest"

  while IFS= read -r resource; do
    [ -n "$resource" ] || continue
    case "$resource" in
      /org/gnome/shell/theme/*) ;;
      *) warn "unexpected resource path ($resource); aborting"; return 1 ;;
    esac
    relative="${resource#/org/gnome/shell/theme/}"
    mkdir -p "$workdir/$(dirname "$relative")"
    gresource extract "$base" "$resource" > "$workdir/$relative" || return 1
    printf '    <file>%s</file>\n' "$relative" >> "$manifest"
    fragment="$(fragment_for_stylesheet "$relative")"
    if [ -n "$fragment" ] && is_greeter_stylesheet "$relative"; then
      append_fragment "$fragment" "$workdir/$relative"
      themed=1
    fi
  done <<< "$resources"
  [ "$themed" = 1 ] || { warn "no greeter stylesheet found in the base gresource"; return 1; }

  add_variant_aliases "$workdir" "$manifest"
  printf '  </gresource>\n</gresources>\n' >> "$manifest"
  glib-compile-resources --sourcedir="$workdir" --target="$out" "$manifest"
}

is_greeter_stylesheet() {
  case "$(basename "$1")" in
    gdm.css | gdm-*.css | gnome-shell.css | gnome-shell-*.css) return 0 ;;
    *) return 1 ;;
  esac
}

append_fragment() {
  { printf '\n/* shadcn-gdm:%s begin */\n' "$THEME"; cat "$1"; printf '\n/* shadcn-gdm:%s end */\n' "$THEME"; } >> "$2"
}

# The shell resolves gdm-<variant>.css before gdm.css; make sure both variants
# exist and carry the matching fragment.
add_variant_aliases() {
  local workdir="$1" manifest="$2" variant
  [ -f "$workdir/gdm.css" ] || return 0
  for variant in dark light; do
    [ -f "$workdir/gdm-$variant.css" ] && continue
    sed '/\/\* shadcn-gdm:.* begin \*\//,$d' "$workdir/gdm.css" > "$workdir/gdm-$variant.css"
    append_fragment "$(fragment_for_stylesheet "gdm-$variant.css")" "$workdir/gdm-$variant.css"
    printf '    <file>%s</file>\n' "gdm-$variant.css" >> "$manifest"
  done
}

validate_gresource() {
  local built="$1" base="$2" base_count built_count listing stylesheet contents themed=0
  [ -s "$built" ] || { warn "built gresource is empty"; return 1; }
  listing="$(gresource list "$built" 2>/dev/null)" || { warn "built gresource is unreadable"; return 1; }
  base_count="$(gresource list "$base" 2>/dev/null | grep -c . || true)"
  built_count="$(printf '%s\n' "$listing" | grep -c . || true)"
  [ "$built_count" -ge "$base_count" ] || { warn "resources lost ($base_count -> $built_count)"; return 1; }
  for stylesheet in gdm.css gdm-dark.css gdm-light.css gnome-shell-dark.css gnome-shell-light.css; do
    [[ "$listing" == *"/org/gnome/shell/theme/$stylesheet"* ]] || continue
    contents="$(gresource extract "$built" "/org/gnome/shell/theme/$stylesheet" 2>/dev/null || true)"
    [[ "$contents" == *"shadcn-gdm:$THEME"* ]] || { warn "marker missing from $stylesheet"; return 1; }
    themed=$((themed + 1))
  done
  [ "$themed" -gt 0 ] || { warn "no greeter stylesheet carries the fragment"; return 1; }
  return 0
}

activate_gresource() {
  local built="$1" alternative="$2" link
  install -Dm644 "$built" "$STORE/$THEME.gresource"
  if [ -n "$alternative" ]; then
    link="$(alternative_link "$alternative")"
    update-alternatives --install "$link" "$alternative" "$STORE/$THEME.gresource" "$ALTERNATIVE_PRIORITY" >/dev/null
    update-alternatives --set "$alternative" "$STORE/$THEME.gresource" >/dev/null
    log "registered with update-alternatives ($alternative)"
  else
    [ -f "$STOCK" ] || die "stock gresource $STOCK not found; refusing to guess"
    [ -f "$BACKUP" ] || { cp -a "$STOCK" "$BACKUP"; log "backed up the stock gresource to $BACKUP"; }
    cp -a "$STORE/$THEME.gresource" "$STOCK"
  fi
}

# Greeter-wide assets live in /usr/local/share so the gdm user can see them;
# every path is recorded for uninstall.
install_shared_assets() {
  : > "$MANIFEST"
  local theme
  if [ -n "$CURSOR_THEME" ]; then copy_shared_asset "$CURSOR_THEME" "$SHARED_ASSETS/icons/$(basename "$CURSOR_THEME")"; fi
  for theme in "${ICON_THEMES[@]}"; do
    copy_shared_asset "$theme" "$SHARED_ASSETS/icons/$(basename "$theme")"
    gtk-update-icon-cache -q -f -t "$SHARED_ASSETS/icons/$(basename "$theme")" 2>/dev/null || true
  done
  if [ -n "$FONT_DIR" ]; then
    copy_shared_asset "$FONT_DIR" "$SHARED_ASSETS/fonts/shadcn-gnome"
    fc-cache -f "$SHARED_ASSETS/fonts/shadcn-gnome" >/dev/null 2>&1 || true
  fi
}

copy_shared_asset() {
  local source="$1" target="$2"
  rm -rf "$target"
  mkdir -p "$(dirname "$target")"
  cp -a "$source" "$target"
  chmod -R a+rX "$target"
  echo "$target" >> "$MANIFEST"
}

remove_shared_assets() {
  [ -f "$MANIFEST" ] || return 0
  local path
  while IFS= read -r path; do
    case "$path" in "$SHARED_ASSETS"/*) rm -rf "$path" ;; esac
  done < "$MANIFEST"
  fc-cache -f >/dev/null 2>&1 || true
}

ensure_gdm_system_db() {
  local profile=/etc/dconf/profile/gdm stock=/usr/share/dconf/profile/gdm current=""
  [ -f "$profile" ] && current="$(cat "$profile")"
  [[ "$current" == *system-db:gdm* ]] && return 0
  mkdir -p /etc/dconf/profile
  if [ -f "$stock" ]; then
    { head -n1 "$stock"; echo 'system-db:gdm'; tail -n +2 "$stock"; } > "$profile"
  elif [ -n "$current" ]; then
    cp "$profile" "$profile.shadcn-backup"
    { head -n1 "$profile.shadcn-backup"; echo 'system-db:gdm'; tail -n +2 "$profile.shadcn-backup"; } > "$profile"
  else
    printf 'user-db:user\nsystem-db:gdm\n' > "$profile"
  fi
  log "layered system-db:gdm into $profile (distro defaults preserved)"
}

write_greeter_settings() {
  command -v dconf >/dev/null || { warn "dconf is unavailable; the greeter keeps its distro accent"; return 0; }
  ensure_gdm_system_db
  mkdir -p "$(dirname "$DCONF_KEYFILE")"
  rm -f "$LEGACY_DCONF_KEYFILE"
  {
    echo "# Written by shadcn-gnome. Remove this file and run 'dconf update' to revert."
    echo "[org/gnome/desktop/interface]"
    echo "accent-color='slate'"
    echo "color-scheme='prefer-$SCHEME'"
    [ -n "$FONT" ] && [ -n "$FONT_DIR" ] && echo "font-name='$FONT'"
    [ -n "$CURSOR_THEME" ] && echo "cursor-theme='$(basename "$CURSOR_THEME")'"
    [ "${#ICON_THEMES[@]}" -gt 0 ] && echo "icon-theme='$(basename "${ICON_THEMES[0]}")'"
  } > "$DCONF_KEYFILE"
  dconf update 2>/dev/null || warn "dconf update failed; greeter settings apply after the next dconf update"
}

require_tools() {
  local tool
  for tool in "$@"; do command -v "$tool" >/dev/null || die "missing '$tool' (install glib2 development tools)"; done
}

do_build() {
  [ -f "$BASE" ] || die "--base must point at a gresource"
  [ -n "$OUT" ] || die "--out is required"
  THEME="${THEME:-preview}"
  build_gresource "$BASE" "$OUT" || die "build failed"
  validate_gresource "$OUT" "$BASE" || die "validation failed"
  log "built and validated $OUT"
}

do_install() {
  [ "$(id -u)" = 0 ] || die "must run as root (use sudo)"
  [ -n "$THEME" ] || die "--theme is required"
  local alternative base built
  alternative="$(alternative_name)"
  base="$(pick_base_gresource "$alternative")" || die "no base GNOME Shell theme gresource found"
  log "base gresource: $base"
  built="$(mktemp --suffix=.gresource)"
  build_gresource "$base" "$built" || { rm -f "$built"; die "build failed; nothing changed"; }
  validate_gresource "$built" "$base" || { rm -f "$built"; die "validation failed; nothing changed"; }
  activate_gresource "$built" "$alternative"
  rm -f "$built"
  install_shared_assets
  write_greeter_settings
  log "done; the greeter changes on the next login or lock (GDM is not restarted)"
}

do_uninstall() {
  [ "$(id -u)" = 0 ] || die "must run as root (use sudo)"
  local alternative line path
  alternative="$(alternative_name)"
  if [ -n "$alternative" ]; then
    while IFS= read -r line; do
      case "$line" in
        "Alternative: $STORE"/*)
          path="${line#Alternative: }"
          update-alternatives --remove "$alternative" "$path" >/dev/null 2>&1 && log "removed alternative $path" ;;
      esac
    done < <(update-alternatives --query "$alternative" 2>/dev/null)
    update-alternatives --auto "$alternative" >/dev/null 2>&1 || true
  fi
  if [ -f "$BACKUP" ]; then
    cp -a "$BACKUP" "$STOCK"
    rm -f "$BACKUP"
    log "restored the stock gresource"
  fi
  remove_shared_assets
  rm -rf "$STORE"
  if [ -f "$DCONF_KEYFILE" ] || [ -f "$LEGACY_DCONF_KEYFILE" ]; then
    rm -f "$DCONF_KEYFILE" "$LEGACY_DCONF_KEYFILE"
    dconf update 2>/dev/null || true
  fi
  log "the distro greeter is back on the next login"
}

main() {
  local action="${1:-}"
  [ $# -gt 0 ] && shift
  parse_options "$@"
  case "$action" in
    install) do_install ;;
    uninstall) do_uninstall ;;
    build) do_build ;;
    *) die "usage: $0 install|uninstall|build [options]" ;;
  esac
}

main "$@"
