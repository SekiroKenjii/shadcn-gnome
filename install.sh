#!/usr/bin/env bash
# Install the shadcn Graphite theme + Lucide icon set + Geist fonts for the
# current user (GNOME / Ubuntu, Wayland). Self-contained and idempotent.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$REPO"

log() { printf '\033[34m::\033[0m %s\n' "$*"; }

for bin in node npm gsettings dconf fc-cache; do
  command -v "$bin" >/dev/null || { echo "missing dependency: $bin"; exit 1; }
done

# --- 1. dependencies (Lucide SVGs + path sampler) --------------------------
log "installing npm deps (lucide-static, svg-path-properties)"
npm install --no-audit --no-fund >/dev/null 2>&1
LUCIDE_DIR="$REPO/node_modules/lucide-static/icons"
[ -d "$LUCIDE_DIR" ] || { echo "lucide-static missing after npm install"; exit 1; }

# --- 2. generate theme surfaces + icon theme -------------------------------
log "generating theme (gtk4/gtk3/shell/ptyxis)"
node "$REPO/build-theme.mjs" >/dev/null
log "generating Lucide icon theme from vendored mapping.json"
node "$REPO/generate-icons.mjs"

# --- 3. install fonts (Geist) ----------------------------------------------
log "installing Geist fonts"
mkdir -p "$HOME/.local/share/fonts/geist"
cp "$REPO/fonts/"*.ttf "$HOME/.local/share/fonts/geist/"
fc-cache -f "$HOME/.local/share/fonts/geist" >/dev/null 2>&1 || true

# --- 4. install GTK css (real files; overwrite any symlink) ----------------
log "installing GTK css"
for v in 3.0 4.0; do
  d="$HOME/.config/gtk-$v"; mkdir -p "$d"
  rm -f "$d/gtk.css"
  cp "$REPO/build/gtk-$v/gtk.css" "$d/gtk.css"
done

# --- 5. install GNOME Shell theme (base + graphite override) ---------------
log "installing GNOME Shell theme 'Shadcn-Graphite'"
BASE="/usr/share/gnome-shell/theme/Yaru-dark"
if [ -d "$BASE" ]; then
  rm -rf "$HOME/.themes/Shadcn-Graphite"
  mkdir -p "$HOME/.themes/Shadcn-Graphite"
  cp -r "$BASE" "$HOME/.themes/Shadcn-Graphite/gnome-shell"
  cat "$REPO/build/shell/shadcn-graphite-shell.css" \
    >> "$HOME/.themes/Shadcn-Graphite/gnome-shell/gnome-shell.css"
else
  echo "  (Yaru-dark base not found; skipping shell theme)"
fi

# --- 6. install Ptyxis palette ---------------------------------------------
log "installing Ptyxis palette"
PD="$HOME/.local/share/org.gnome.Ptyxis/palettes"; mkdir -p "$PD"
cp "$REPO/build/ptyxis/Shadcn Graphite.palette" "$PD/"

# --- 7. install icon theme -------------------------------------------------
log "installing Lucide icon theme ($(find "$REPO/build/Lucide" -name '*.svg' | wc -l) svgs)"
rm -rf "$HOME/.local/share/icons/Lucide"
cp -r "$REPO/build/Lucide" "$HOME/.local/share/icons/Lucide"
command -v gtk-update-icon-cache >/dev/null 2>&1 && \
  gtk-update-icon-cache -q -f -t "$HOME/.local/share/icons/Lucide" 2>/dev/null || true

# --- 8. apply settings -----------------------------------------------------
log "applying settings"
gsettings set org.gnome.desktop.interface font-name 'Geist 11'
gsettings set org.gnome.desktop.interface gtk-theme 'Yaru-dark'
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
gsettings set org.gnome.desktop.interface accent-color 'slate' 2>/dev/null || true
gsettings set org.gnome.desktop.interface icon-theme 'Lucide'
# Ptyxis default profile palette (UUID resolved at run time)
if gsettings list-schemas 2>/dev/null | grep -q org.gnome.Ptyxis; then
  uuid="$(gsettings get org.gnome.Ptyxis default-profile-uuid 2>/dev/null | tr -d \")"
  [ -n "$uuid" ] && dconf write "/org/gnome/Ptyxis/Profiles/$uuid/palette" "'Shadcn Graphite'"
fi
# GNOME Shell theme via the User Themes extension (dconf; schema lives in the ext)
if gnome-extensions list 2>/dev/null | grep -q user-theme; then
  dconf write /org/gnome/shell/extensions/user-theme/name "''"
  dconf write /org/gnome/shell/extensions/user-theme/name "'Shadcn-Graphite'"
else
  echo "  User Themes extension not enabled — enable it and set theme 'Shadcn-Graphite'"
fi

echo
log "done. GTK apps + terminal apply on restart; the Shell theme and icon"
log "theme apply live, but log out/in for a fully consistent result."
