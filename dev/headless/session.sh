#!/usr/bin/env bash
# Runs inside `dbus-run-session`: installs the theme into the sandbox HOME,
# starts a headless GNOME Shell and captures each scene.
set -euo pipefail

: "${REPO_ROOT:?}" "${SHOTS_DIR:?}" "${SCHEME:?}" "${SCENES:?}" "${INSTALL_FLAGS:?}"
readonly DEVKIT_UUID=devkit@shadcn-gnome.dev
readonly SHELL_LOG="$SHOTS_DIR/$SCHEME-gnome-shell.log"
readonly THEME_UUID=shadcn-gnome@sekirokenjii.github.io

shell_eval() {
  gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Eval "$1"
}

screenshot() {
  gdbus call --session --dest org.gnome.Shell.Screenshot --object-path /org/gnome/Shell/Screenshot \
    --method org.gnome.Shell.Screenshot.Screenshot false false "$1" >/dev/null
}

wait_for_shell() {
  local _
  for _ in $(seq 1 60); do
    [[ "$(shell_eval 'typeof shadcnDevkit' 2>/dev/null || true)" == *object* ]] && return 0
    sleep 0.5
  done
  echo "GNOME Shell did not come up; last lines of $SHELL_LOG:" >&2
  tail -n 40 "$SHELL_LOG" >&2
  return 1
}

read -r -a install_flags <<< "$INSTALL_FLAGS"
"$REPO_ROOT/install.sh" "${install_flags[@]}" --scheme "$SCHEME" > "$SHOTS_DIR/$SCHEME-install.log" 2>&1

mkdir -p "$HOME/.local/share/gnome-shell/extensions"
cp -r "$REPO_ROOT/dev/headless/$DEVKIT_UUID" "$HOME/.local/share/gnome-shell/extensions/"
gsettings set org.gnome.shell enabled-extensions "['$THEME_UUID', '$DEVKIT_UUID']"
gsettings set org.gnome.shell disable-extension-version-validation true
gsettings set org.gnome.shell welcome-dialog-last-shown-version '999'
gsettings set org.gnome.desktop.notifications show-banners true

gnome-shell --headless --wayland --no-x11 --virtual-monitor "${RESOLUTION:-1440x900}" > "$SHELL_LOG" 2>&1 &
shell_pid=$!
trap 'kill "$shell_pid" 2>/dev/null || true; wait "$shell_pid" 2>/dev/null || true' EXIT
wait_for_shell
sleep 2

settle_seconds() {
  case "$1" in
    osd) echo 0.4 ;;
    notification | lock-screen) echo 3 ;;
    overview | app-grid) echo 2.5 ;;
    *) echo "${SETTLE_SECONDS:-1.5}" ;;
  esac
}

IFS=, read -r -a scene_list <<< "$SCENES"
for scene in "${scene_list[@]}"; do
  shell_eval "shadcnDevkit.reset()" >/dev/null
  sleep 1.5
  shell_eval "shadcnDevkit.show('$scene')" >/dev/null
  sleep "$(settle_seconds "$scene")"
  screenshot "$SHOTS_DIR/$SCHEME-$scene.png"
  echo "captured $SCHEME-$scene.png"
done
