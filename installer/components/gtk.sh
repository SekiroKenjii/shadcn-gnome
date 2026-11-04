# shellcheck shell=bash

component_gtk_targets() { echo gtk; }

component_gtk_install() {
  local gtk4="$CONFIG_HOME/gtk-4.0/gtk.css" gtk3="$CONFIG_HOME/gtk-3.0/gtk.css"
  mkdir -p "$(dirname "$gtk4")" "$(dirname "$gtk3")"
  backup_foreign_file "$gtk4"
  backup_foreign_file "$gtk3"
  install -m644 "$BUILD_DIR/gtk-4.0/gtk.css" "$gtk4"
  install -m644 "$BUILD_DIR/gtk-3.0/gtk-$SCHEME.css" "$gtk3"
  apply_setting org.gnome.desktop.interface color-scheme "'prefer-$SCHEME'"
  apply_setting org.gnome.desktop.interface accent-color "'slate'"
  apply_setting org.gnome.desktop.interface gtk-theme "'$(gtk3_base_theme)'"
  success "GTK4 (light + dark) and GTK3 ($SCHEME) stylesheets"
}

component_gtk_uninstall() {
  restore_foreign_file "$CONFIG_HOME/gtk-4.0/gtk.css"
  restore_foreign_file "$CONFIG_HOME/gtk-3.0/gtk.css"
}

gtk3_base_theme() {
  local suffix=""
  [ "$SCHEME" = dark ] && suffix="-dark"
  if [ -d "/usr/share/themes/Yaru$suffix" ]; then echo "Yaru$suffix"; else echo "Adwaita$suffix"; fi
}
