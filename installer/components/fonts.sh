# shellcheck shell=bash

component_fonts_targets() { :; }

component_fonts_install() {
  mkdir -p "$FONTS_DIR"
  cp "$REPO_ROOT/assets/fonts/"*.ttf "$FONTS_DIR/"
  fc-cache -f "$FONTS_DIR" >/dev/null 2>&1 || true
  apply_setting org.gnome.desktop.interface font-name "'$(theme_field fonts.interface)'"
  apply_setting org.gnome.desktop.interface document-font-name "'$(theme_field fonts.document)'"
  apply_setting org.gnome.desktop.interface monospace-font-name "'$(theme_field fonts.monospace)'"
  success "Geist and Geist Mono"
}

component_fonts_uninstall() {
  rm -rf "$FONTS_DIR"
  fc-cache -f >/dev/null 2>&1 || true
}
