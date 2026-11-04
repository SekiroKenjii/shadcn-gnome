# shellcheck shell=bash

readonly GDM_STORE=/usr/share/gnome-shell/theme/shadcn-gdm
readonly GDM_STOCK_BACKUP=/usr/share/gnome-shell/gnome-shell-theme.gresource.shadcn-backup

component_gdm_targets() {
  echo gdm
  [ "$WITH_CURSORS" = 1 ] && echo cursors
  [ "$WITH_ICONS" = 1 ] && echo icons
  return 0
}

component_gdm_install() {
  if ! command -v gdm >/dev/null && [ ! -d /etc/gdm3 ] && [ ! -d /etc/gdm ]; then
    warn "GDM does not look like the display manager; skipping the login screen"
    return 0
  fi
  if [ -z "$SUDO" ] && [ "$(id -u)" -ne 0 ]; then
    warn "theming the login screen needs root and sudo is unavailable; skipping"
    return 0
  fi
  local arguments=(
    install
    --theme "$THEME"
    --scheme "$SCHEME"
    --fragment-dark "$BUILD_DIR/gdm/greeter-dark.css"
    --fragment-light "$BUILD_DIR/gdm/greeter-light.css"
    --font "$(theme_field fonts.interface)"
  )
  [ "$WITH_CURSORS" = 1 ] && arguments+=(--cursor-theme "$BUILD_DIR/cursors/$(cursor_theme_name)")
  [ "$WITH_ICONS" = 1 ] && arguments+=(--icon-theme "$BUILD_DIR/icons/$(icon_theme_for_scheme)" --icon-theme "$BUILD_DIR/icons/Lucide")
  [ "$WITH_FONTS" = 1 ] && arguments+=(--font-dir "$REPO_ROOT/assets/fonts")

  log "theming the login screen (sudo may prompt; fully reversible)"
  if $SUDO bash "$REPO_ROOT/installer/gdm-helper.sh" "${arguments[@]}"; then
    success "GDM login screen (appears on the next login or lock)"
  else
    warn "GDM theming failed; the login screen was left unchanged"
  fi
}

component_gdm_uninstall() {
  [ -d "$GDM_STORE" ] || [ -f "$GDM_STOCK_BACKUP" ] || [ -f /etc/dconf/db/gdm.d/07-shadcn-gnome ] || [ -f /etc/dconf/db/gdm.d/07-shadcn-accent ] || return 0
  if [ -z "$SUDO" ] && [ "$(id -u)" -ne 0 ]; then
    warn "login screen theming is present but sudo is unavailable; run: sudo $REPO_ROOT/installer/gdm-helper.sh uninstall"
    return 0
  fi
  log "reverting the login screen (sudo may prompt)"
  $SUDO bash "$REPO_ROOT/installer/gdm-helper.sh" uninstall || warn "GDM revert reported an error"
}
