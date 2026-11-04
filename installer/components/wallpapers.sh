# shellcheck shell=bash

component_wallpapers_targets() { echo wallpapers; }

component_wallpapers_install() {
  local pattern light dark properties
  pattern="$(theme_field wallpaper)"
  light="$BACKGROUNDS_DIR/shadcn-$pattern-light.svg"
  dark="$BACKGROUNDS_DIR/shadcn-$pattern-dark.svg"
  mkdir -p "$BACKGROUNDS_DIR" "$BACKGROUND_PROPERTIES_DIR"
  cp "$BUILD_DIR/backgrounds/"*.svg "$BACKGROUNDS_DIR/"
  properties="$BACKGROUND_PROPERTIES_DIR/shadcn-$THEME.xml"
  sed "s#@BACKGROUNDS_DIR@#$BACKGROUNDS_DIR#g" "$BUILD_DIR/gnome-background-properties/shadcn-$THEME.xml" > "$properties"
  apply_setting org.gnome.desktop.background picture-uri "'file://$light'"
  apply_setting org.gnome.desktop.background picture-uri-dark "'file://$dark'"
  apply_setting org.gnome.desktop.background picture-options "'zoom'"
  apply_setting org.gnome.desktop.screensaver picture-uri "'file://$(wallpaper_for_scheme "$light" "$dark")'"
  success "wallpaper $pattern (light + dark)"
}

component_wallpapers_uninstall() {
  rm -rf "$BACKGROUNDS_DIR"
  rm -f "$BACKGROUND_PROPERTIES_DIR"/shadcn-*.xml
}

wallpaper_for_scheme() {
  if [ "$SCHEME" = light ]; then echo "$1"; else echo "$2"; fi
}
