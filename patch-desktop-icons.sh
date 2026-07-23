#!/usr/bin/env bash
# patch-desktop-icons.sh — a few snap apps hardcode Icon= to an absolute PNG path
# *inside* their snap (e.g. /snap/snap-store/current/.../app-center.png). The icon
# theme cannot override an absolute path, so these keep their own icon no matter
# what the Lucide theme provides.
#
# Fix: drop a user-level .desktop override (same desktop-id) into
# ~/.local/share/applications that copies the original launcher verbatim and only
# swaps Icon= for a themable NAME that the Lucide theme ships. A user .desktop
# fully shadows the system one, so we copy every field to avoid breaking Exec.
#
# Idempotent — safe to re-run (e.g. after a snap refresh). `--uninstall` removes
# the overrides and restores the snap's own icons.
set -euo pipefail

DEST="$HOME/.local/share/applications"
SRCDIRS=(/var/lib/snapd/desktop/applications /var/lib/flatpak/exports/share/applications /usr/share/applications)

# desktop-id (filename without .desktop)  ->  themable Icon name the theme ships
declare -A MAP=(
  [firmware-updater_firmware-updater]=firmware-updater
  [firmware-updater_firmware-updater-app]=firmware-updater
  [desktop-security-center_desktop-security-center]=desktop-security-center
  [snap-store_snap-store]=snap-store
  [snap-store_show-updates]=snap-store
  [snapd-desktop-integration_snapd-desktop-integration]=snap-store
)

find_src() {
  local id="$1"
  for d in "${SRCDIRS[@]}"; do
    [ -f "$d/$id.desktop" ] && { echo "$d/$id.desktop"; return 0; }
  done
  return 1
}

if [ "${1:-}" = "--uninstall" ]; then
  for id in "${!MAP[@]}"; do
    f="$DEST/$id.desktop"
    if [ -f "$f" ] && grep -q '^# Lucide-theme icon override' "$f"; then
      rm -f "$f"; echo "removed override: $id"
    fi
  done
  update-desktop-database "$DEST" 2>/dev/null || true
  echo "done (uninstall)."
  exit 0
fi

mkdir -p "$DEST"
n=0
for id in "${!MAP[@]}"; do
  icon="${MAP[$id]}"
  src="$(find_src "$id")" || { echo "skip $id (source .desktop not found)"; continue; }
  dst="$DEST/$id.desktop"
  # copy verbatim, replace ONLY Icon= lines, prepend a marker comment
  {
    echo "# Lucide-theme icon override — regenerate with patch-desktop-icons.sh"
    sed -E "s#^Icon=.*#Icon=$icon#" "$src"
  } > "$dst"
  grep -q '^Icon=' "$dst" || echo "Icon=$icon" >> "$dst"
  echo "override: $id -> Icon=$icon"
  n=$((n+1))
done
update-desktop-database "$DEST" 2>/dev/null || true
echo "done: $n override(s) written to $DEST"
echo "(the matching apps/<name>.svg is provided by the Lucide theme; log out/in or"
echo " restart the shell for the dock/app-grid to pick them up.)"
