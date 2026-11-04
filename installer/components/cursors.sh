# shellcheck shell=bash

readonly CURSOR_THEMES=(Shadcn Shadcn-Dark)

component_cursors_targets() { echo cursors; }

component_cursors_install() {
  local name
  mkdir -p "$ICONS_DIR"
  for name in "${CURSOR_THEMES[@]}"; do
    rm -rf "${ICONS_DIR:?}/$name"
    cp -a "$BUILD_DIR/cursors/$name" "$ICONS_DIR/$name"
  done
  apply_setting org.gnome.desktop.interface cursor-theme "'$(cursor_theme_name)'"
  success "cursor theme $(cursor_theme_name) (SVG + Xcursor 24/32/48/64)"
}

component_cursors_uninstall() {
  local name
  for name in "${CURSOR_THEMES[@]}"; do rm -rf "${ICONS_DIR:?}/$name"; done
}

cursor_theme_name() {
  if [ "$CURSOR_VARIANT" = dark ]; then echo Shadcn-Dark; else echo Shadcn; fi
}
