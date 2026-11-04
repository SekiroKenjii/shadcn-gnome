# shellcheck shell=bash

component_vitals_targets() { :; }

component_vitals_install() {
  if [ ! -d "$VITALS_DIR" ]; then
    warn "Vitals extension is not installed; nothing to recolor"
    return 0
  fi
  sg_cli vitals patch "$VITALS_DIR"
}

component_vitals_uninstall() {
  [ -d "$VITALS_DIR" ] && sg_cli vitals restore "$VITALS_DIR" >/dev/null
  return 0
}
