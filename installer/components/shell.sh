# shellcheck shell=bash

readonly SHELL_EXTENSION_UUID="shadcn-gnome@sekirokenjii.github.io"
readonly USER_THEME_UUID="user-theme@gnome-shell-extensions.gcampax.github.com"

component_shell_targets() { echo shell; }

component_shell_install() {
  local destination="$EXTENSIONS_DIR/$SHELL_EXTENSION_UUID"
  rm -rf "$destination"
  mkdir -p "$EXTENSIONS_DIR"
  cp -r "$BUILD_DIR/gnome-shell/$SHELL_EXTENSION_UUID" "$destination"
  remove_legacy_shell_themes
  release_user_theme_slot
  enable_extension "$SHELL_EXTENSION_UUID"
  success "GNOME Shell theme (extension $SHELL_EXTENSION_UUID, follows Dark Style)"
}

component_shell_uninstall() {
  disable_extension "$SHELL_EXTENSION_UUID"
  rm -rf "${EXTENSIONS_DIR:?}/$SHELL_EXTENSION_UUID"
  remove_legacy_shell_themes
}

enabled_extensions() {
  gsettings get org.gnome.shell enabled-extensions 2>/dev/null || echo "@as []"
}

enable_extension() {
  local uuid="$1" current
  remember_setting org.gnome.shell enabled-extensions
  gnome-extensions enable "$uuid" >/dev/null 2>&1 || true
  current="$(enabled_extensions)"
  if [[ "$current" != *"'$uuid'"* ]]; then
    gsettings set org.gnome.shell enabled-extensions "$(gvariant_list_append "$current" "$uuid")"
  fi
}

disable_extension() {
  local uuid="$1" current
  remember_setting org.gnome.shell enabled-extensions
  gnome-extensions disable "$uuid" >/dev/null 2>&1 || true
  current="$(enabled_extensions)"
  [[ "$current" == *"'$uuid'"* ]] || return 0
  gsettings set org.gnome.shell enabled-extensions "$(gvariant_list_remove "$current" "$uuid")"
}

gvariant_list_append() {
  local list="${1#@as }" item="$2"
  if [ "$list" = "[]" ]; then echo "['$item']"; else echo "${list%]}, '$item']"; fi
}

gvariant_list_remove() {
  local list="${1#@as }" item="$2"
  list="${list//", '$item'"/}"
  list="${list//"'$item', "/}"
  list="${list//"'$item'"/}"
  echo "$list"
}

# User Themes owns the same stylesheet slot; when it only points at an older
# Shadcn-* build (or nothing) it is switched off so the two never fight.
release_user_theme_slot() {
  local name
  [[ "$(enabled_extensions)" == *"'$USER_THEME_UUID'"* ]] || return 0
  name="$(dconf read /org/gnome/shell/extensions/user-theme/name 2>/dev/null || true)"
  case "$name" in
    "" | "''" | "'Shadcn-"*)
      dconf write /org/gnome/shell/extensions/user-theme/name "''" 2>/dev/null || true
      disable_extension "$USER_THEME_UUID"
      log "User Themes was only serving an old shadcn theme; disabled it" ;;
    *) warn "User Themes is active with $name; it will override the shadcn Shell theme until you disable it" ;;
  esac
}

remove_legacy_shell_themes() {
  local legacy
  for legacy in "$HOME/.themes"/Shadcn-* "$DATA_HOME/themes"/Shadcn-*; do
    [ -e "$legacy" ] && rm -rf "$legacy"
  done
  return 0
}
