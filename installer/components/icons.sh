# shellcheck shell=bash

readonly ICON_THEMES=(Lucide Lucide-Light)

component_icons_targets() { echo icons; }

component_icons_install() {
  local name
  mkdir -p "$ICONS_DIR"
  for name in "${ICON_THEMES[@]}"; do
    rm -rf "${ICONS_DIR:?}/$name"
    cp -r "$BUILD_DIR/icons/$name" "$ICONS_DIR/$name"
    gtk-update-icon-cache -q -f -t "$ICONS_DIR/$name" 2>/dev/null || true
  done
  apply_setting org.gnome.desktop.interface icon-theme "'$(icon_theme_for_scheme)'"
  override_hardcoded_launcher_icons
  success "Lucide icon theme ($(find "$ICONS_DIR/Lucide" -name '*.svg' | wc -l) icons)"
}

component_icons_uninstall() {
  local name
  for name in "${ICON_THEMES[@]}"; do rm -rf "${ICONS_DIR:?}/$name"; done
  restore_launcher_icons
}

icon_theme_for_scheme() {
  if [ "$SCHEME" = light ]; then echo Lucide-Light; else echo Lucide; fi
}

readonly LAUNCHER_MARKER="# $GENERATED_MARKER: icon override"
readonly LEGACY_LAUNCHER_MARKER="# Lucide-theme icon override (regenerate with patch-desktop-icons.sh)"
readonly LAUNCHER_SOURCES=(/var/lib/snapd/desktop/applications /var/lib/flatpak/exports/share/applications /usr/share/applications)

# Some snaps point Icon= at an absolute PNG inside the snap, which no icon theme
# can override, so a user-level copy of the launcher swaps in a themable name.
override_hardcoded_launcher_icons() {
  local desktop_id icon source target
  mkdir -p "$APPLICATIONS_DIR"
  while IFS=$'\t' read -r desktop_id icon; do
    source="$(find_launcher "$desktop_id")" || continue
    target="$APPLICATIONS_DIR/$desktop_id.desktop"
    { echo "$LAUNCHER_MARKER"; sed -E "s#^Icon=.*#Icon=$icon#" "$source"; } > "$target"
  done < <(sg_cli desktop-overrides)
  update-desktop-database "$APPLICATIONS_DIR" 2>/dev/null || true
}

restore_launcher_icons() {
  local launcher
  local first_line
  for launcher in "$APPLICATIONS_DIR"/*.desktop; do
    [ -f "$launcher" ] || continue
    first_line="$(head -n1 "$launcher")"
    if [ "$first_line" = "$LAUNCHER_MARKER" ] || [ "$first_line" = "$LEGACY_LAUNCHER_MARKER" ]; then
      rm -f "$launcher"
    fi
  done
  update-desktop-database "$APPLICATIONS_DIR" 2>/dev/null || true
}

find_launcher() {
  local directory
  for directory in "${LAUNCHER_SOURCES[@]}"; do
    [ -f "$directory/$1.desktop" ] && { echo "$directory/$1.desktop"; return 0; }
  done
  return 1
}
