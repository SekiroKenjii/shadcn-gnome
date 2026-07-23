#!/usr/bin/env bash
# Remove the shadcn Graphite theme + Lucide icons + Geist and revert settings.
set -euo pipefail
log() { printf '\033[34m::\033[0m %s\n' "$*"; }

log "reverting interface settings to GNOME/Ubuntu defaults"
gsettings reset org.gnome.desktop.interface font-name || true
gsettings reset org.gnome.desktop.interface icon-theme || true
gsettings reset org.gnome.desktop.interface gtk-theme || true
gsettings reset org.gnome.desktop.interface accent-color || true
dconf write /org/gnome/shell/extensions/user-theme/name "''" 2>/dev/null || true

log "removing installed files"
rm -rf "$HOME/.themes/Shadcn-Graphite"
rm -rf "$HOME/.local/share/icons/Lucide"
rm -rf "$HOME/.local/share/fonts/geist"
rm -f  "$HOME/.local/share/org.gnome.Ptyxis/palettes/Shadcn Graphite.palette"
rm -f  "$HOME/.config/gtk-3.0/gtk.css" "$HOME/.config/gtk-4.0/gtk.css"
fc-cache -f >/dev/null 2>&1 || true

echo
log "done. Log out/in to complete. (GTK css files were removed; if you use a"
log "dotfiles-managed gtk.css, re-stow it.)"
