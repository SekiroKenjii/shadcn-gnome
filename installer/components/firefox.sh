# shellcheck shell=bash

readonly FIREFOX_PREFS_BEGIN="// >>> $GENERATED_MARKER firefox prefs"
readonly FIREFOX_PREFS_END="// <<< $GENERATED_MARKER firefox prefs"

component_firefox_targets() { echo firefox; }

component_firefox_install() {
  local profile themed=0
  while IFS= read -r profile; do
    mkdir -p "$profile/chrome"
    backup_foreign_file "$profile/chrome/userChrome.css"
    backup_foreign_file "$profile/chrome/userContent.css"
    cp "$BUILD_DIR/firefox/userChrome.css" "$BUILD_DIR/firefox/userContent.css" "$profile/chrome/"
    replace_prefs_block "$profile/user.js" "$BUILD_DIR/firefox/user.js"
    themed=$((themed + 1))
  done < <(firefox_profiles)
  if [ "$themed" -eq 0 ]; then
    warn "no Firefox profile found; start Firefox once, then re-run with --firefox"
  else
    success "Firefox chrome in $themed profile(s); restart Firefox to apply"
  fi
}

component_firefox_uninstall() {
  local profile
  while IFS= read -r profile; do
    restore_foreign_file "$profile/chrome/userChrome.css"
    restore_foreign_file "$profile/chrome/userContent.css"
    [ -f "$profile/chrome/userChrome.css.shadcn-bak" ] && mv "$profile/chrome/userChrome.css.shadcn-bak" "$profile/chrome/userChrome.css"
    replace_prefs_block "$profile/user.js" /dev/null
    [ -s "$profile/user.js" ] || rm -f "$profile/user.js"
  done < <(firefox_profiles)
}

firefox_profiles() {
  local root profile
  for root in "$HOME/.mozilla/firefox" "$CONFIG_HOME/mozilla/firefox" \
              "$HOME/snap/firefox/common/.mozilla/firefox" "$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox"; do
    [ -d "$root" ] || continue
    for profile in "$root"/*/; do
      [ -f "$profile/prefs.js" ] || [ -f "$profile/times.json" ] || continue
      echo "${profile%/}"
    done
  done
}

replace_prefs_block() {
  local user_js="$1" block="$2" kept
  [ -f "$user_js" ] || [ "$block" != /dev/null ] || return 0
  kept="$(awk -v b="$FIREFOX_PREFS_BEGIN" -v e="$FIREFOX_PREFS_END" '$0==b{skip=1} !skip{print} $0==e{skip=0}' "$user_js" 2>/dev/null || true)"
  {
    [ -n "$kept" ] && printf '%s\n' "$kept"
    if [ "$block" != /dev/null ]; then echo "$FIREFOX_PREFS_BEGIN"; cat "$block"; echo "$FIREFOX_PREFS_END"; fi
  } > "$user_js"
}
