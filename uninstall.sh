#!/usr/bin/env bash
# uninstall.sh: remove every shadcn theme surface this repo installs and revert
# the GNOME interface settings to their defaults. Safe to run repeatedly.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
log() { printf '\033[34m::\033[0m %s\n' "$*"; }

log "reverting interface settings to GNOME defaults"
for k in font-name icon-theme gtk-theme accent-color color-scheme; do
  gsettings reset org.gnome.desktop.interface "$k" 2>/dev/null || true
done
dconf write /org/gnome/shell/extensions/user-theme/name "''" 2>/dev/null || true

log "removing installed files"
# every Shadcn-* Shell theme (Graphite/Mono/Vercel/…)
for d in "$HOME/.themes/"Shadcn-*; do [ -e "$d" ] && rm -rf "$d"; done
rm -rf "$HOME/.local/share/icons/Lucide"
rm -rf "$HOME/.local/share/fonts/geist"
# every "Shadcn *.palette" Ptyxis palette
for p in "$HOME/.local/share/org.gnome.Ptyxis/palettes/"Shadcn\ *.palette; do
  [ -e "$p" ] && rm -f "$p"
done
# clear the profile's palette pointer so it doesn't dangle at a removed palette
uuid="$(gsettings get org.gnome.Ptyxis default-profile-uuid 2>/dev/null | tr -d "\"'")"
[ -n "$uuid" ] && dconf reset "/org/gnome/Ptyxis/Profiles/$uuid/palette" 2>/dev/null || true
rm -f "$HOME/.config/gtk-3.0/gtk.css" "$HOME/.config/gtk-4.0/gtk.css"
fc-cache -f >/dev/null 2>&1 || true

# remove the snap .desktop icon overrides
if [ -f "$REPO/scripts/patch-desktop-icons.sh" ]; then
  bash "$REPO/scripts/patch-desktop-icons.sh" --uninstall 2>/dev/null || true
fi

# restore the Vitals extension's original bundled icons, if we patched them
VIT="$HOME/.local/share/gnome-shell/extensions/Vitals@CoreCoding.com/icons"
if [ -d "$VIT" ]; then
  for set in original gnome; do
    [ -d "$VIT/_backup-$set" ] || continue
    log "restoring Vitals '$set' icons"
    cp -rf "$VIT/_backup-$set/." "$VIT/$set/" 2>/dev/null || true
    rm -rf "$VIT/_backup-$set"
  done
fi

# revert Firefox chrome theming from every profile we wrote to
FF_BEGIN="// >>> shadcn-gnome firefox prefs"
FF_END="// <<< shadcn-gnome firefox prefs"
for root in "$HOME/.mozilla/firefox" \
            "${XDG_CONFIG_HOME:-$HOME/.config}/mozilla/firefox" \
            "$HOME/snap/firefox/common/.mozilla/firefox" \
            "$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox"; do
  [ -d "$root" ] || continue
  for prof in "$root"/*/; do
    ch="$prof/chrome"
    if [ -f "$ch/userChrome.css" ] && grep -q 'shadcn-gnome' "$ch/userChrome.css"; then
      if [ -f "$ch/userChrome.css.shadcn-bak" ]; then
        mv "$ch/userChrome.css.shadcn-bak" "$ch/userChrome.css"
      else
        rm -f "$ch/userChrome.css"
      fi
      grep -q 'shadcn-gnome' "$ch/userContent.css" 2>/dev/null && rm -f "$ch/userContent.css"
      log "reverted Firefox theming in $(basename "$prof")"
    fi
    uj="$prof/user.js"
    if [ -f "$uj" ] && grep -qF "$FF_BEGIN" "$uj"; then
      # awk range delete (markers contain '/', which sed /addr/ can't handle)
      tmp="$(mktemp)"
      awk -v b="$FF_BEGIN" -v e="$FF_END" '$0==b{skip=1} skip==0{print} $0==e{skip=0}' "$uj" > "$tmp"
      mv "$tmp" "$uj"
      [ -s "$uj" ] || rm -f "$uj"
    fi
  done
done

# revert GDM login-screen theming, but only if we actually installed it (avoid a
# needless sudo prompt otherwise). The helper auto-reverts to the distro theme.
if [ -d /usr/share/gnome-shell/theme/shadcn-gdm ] \
   || [ -f /usr/share/gnome-shell/gnome-shell-theme.gresource.shadcn-backup ]; then
  SUDO=""; [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null && SUDO="sudo"
  if [ -n "$SUDO" ] || [ "$(id -u)" -eq 0 ]; then
    log "reverting GDM login-screen theming (sudo may prompt)"
    $SUDO bash "$REPO/lib/gdm-theme-setup.sh" uninstall 2>/dev/null || true
  else
    log "GDM theming present but sudo unavailable. Revert with: sudo ./lib/gdm-theme-setup.sh uninstall"
  fi
fi

echo
log "done. Log out/in to complete. (GTK css files were removed; if you use a"
log "dotfiles-managed gtk.css, re-stow it.)"
