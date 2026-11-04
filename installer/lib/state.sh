# shellcheck shell=bash
# Remembers what the installer changed so uninstall restores the user's own
# values instead of resetting everything to GNOME defaults.

readonly SETTINGS_LEDGER="$STATE_DIR/settings.tsv"

remember_setting() {
  local schema="$1" key="$2" current
  mkdir -p "$STATE_DIR"
  touch "$SETTINGS_LEDGER"
  if awk -F'\t' -v s="$schema" -v k="$key" '$1 == s && $2 == k { found = 1 } END { exit !found }' "$SETTINGS_LEDGER"; then
    return 0
  fi
  current="$(gsettings get "$schema" "$key" 2>/dev/null)" || return 0
  printf '%s\t%s\t%s\n' "$schema" "$key" "$current" >> "$SETTINGS_LEDGER"
}

setting_exists() {
  local keys
  keys="$(gsettings list-keys "$1" 2>/dev/null || true)"
  [[ $'\n'"$keys"$'\n' == *$'\n'"$2"$'\n'* ]]
}

apply_setting() {
  local schema="$1" key="$2" value="$3"
  setting_exists "$schema" "$key" || {
    warn "setting $schema $key is not available on this system; skipped"
    return 0
  }
  remember_setting "$schema" "$key"
  gsettings set "$schema" "$key" "$value"
}

restore_settings() {
  [ -f "$SETTINGS_LEDGER" ] || return 0
  local schema key value
  while IFS=$'\t' read -r schema key value; do
    [ -n "$schema" ] || continue
    gsettings set "$schema" "$key" "$value" 2>/dev/null \
      || gsettings reset "$schema" "$key" 2>/dev/null || true
  done < "$SETTINGS_LEDGER"
  rm -f "$SETTINGS_LEDGER"
}

is_generated_by_us() {
  [ -f "$1" ] && grep -q "$GENERATED_MARKER" "$1"
}

backup_foreign_file() {
  local file="$1"
  if [ -f "$file" ] && ! is_generated_by_us "$file" && [ ! -e "$file.shadcn-backup" ]; then
    cp -a "$file" "$file.shadcn-backup"
    log "kept your existing $(basename "$file") as $file.shadcn-backup"
  fi
}

restore_foreign_file() {
  local file="$1"
  if is_generated_by_us "$file"; then rm -f "$file"; fi
  if [ -f "$file.shadcn-backup" ]; then mv "$file.shadcn-backup" "$file"; fi
}
