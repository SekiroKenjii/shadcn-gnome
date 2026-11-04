# shellcheck shell=bash

component_terminal_targets() { echo terminal; }

component_terminal_install() {
  local label profile
  label="$(theme_field label)"
  mkdir -p "$PTYXIS_PALETTES_DIR"
  cp "$BUILD_DIR/ptyxis/$label.palette" "$PTYXIS_PALETTES_DIR/"
  if ! setting_exists org.gnome.Ptyxis default-profile-uuid; then
    warn "Ptyxis not detected; palette copied, pick '$label' in Ptyxis > Preferences"
    return 0
  fi
  profile="$(gsettings get org.gnome.Ptyxis default-profile-uuid | tr -d "'\"")"
  [ -n "$profile" ] && dconf write "/org/gnome/Ptyxis/Profiles/$profile/palette" "'$label'"
  success "Ptyxis palette '$label'"
}

component_terminal_uninstall() {
  local palette profile
  for palette in "$PTYXIS_PALETTES_DIR"/Shadcn\ *.palette; do
    [ -e "$palette" ] && rm -f "$palette"
  done
  setting_exists org.gnome.Ptyxis default-profile-uuid || return 0
  profile="$(gsettings get org.gnome.Ptyxis default-profile-uuid | tr -d "'\"")"
  [ -n "$profile" ] && dconf reset "/org/gnome/Ptyxis/Profiles/$profile/palette" 2>/dev/null
  return 0
}
