# shellcheck shell=bash
# Shared helpers for the development scripts.

DEV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
REPO_ROOT="$(cd "$DEV_ROOT/.." && pwd -P)"
SANDBOX_ROOT="${SANDBOX_ROOT:-$REPO_ROOT/build/sandbox}"
SANDBOX_ENV="$SANDBOX_ROOT/session.env"
NESTED_DISPLAY=shadcn-sandbox
DEVKIT_UUID=devkit@shadcn-gnome.dev
THEME_UUID=shadcn-gnome@sekirokenjii.github.io
export DEV_ROOT REPO_ROOT SANDBOX_ROOT SANDBOX_ENV NESTED_DISPLAY DEVKIT_UUID THEME_UUID

# shellcheck source=installer/lib/log.sh
source "$REPO_ROOT/installer/lib/log.sh"

shell_eval() {
  gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Eval "$1"
}

shell_screenshot() {
  gdbus call --session --dest org.gnome.Shell.Screenshot --object-path /org/gnome/Shell/Screenshot \
    --method org.gnome.Shell.Screenshot.Screenshot false false "$1" >/dev/null
}

wait_for_devkit() {
  local _
  for _ in $(seq 1 80); do
    [[ "$(shell_eval 'typeof shadcnDevkit' 2>/dev/null || true)" == *object* ]] && return 0
    sleep 0.5
  done
  return 1
}

show_scene() {
  shell_eval "shadcnDevkit.reset()" >/dev/null
  sleep 1
  shell_eval "shadcnDevkit.show('$1')" >/dev/null
}

# Which flag runs GNOME Shell inside a window on the current desktop.
nested_shell_flag() {
  local help
  help="$(gnome-shell --help 2>&1 || true)"
  if [[ "$help" == *--devkit* ]]; then echo --devkit; else echo --nested; fi
}

prepare_sandbox_extensions() {
  mkdir -p "$HOME/.local/share/gnome-shell/extensions"
  rm -rf "$HOME/.local/share/gnome-shell/extensions/$DEVKIT_UUID"
  cp -r "$DEV_ROOT/headless/$DEVKIT_UUID" "$HOME/.local/share/gnome-shell/extensions/"
  gsettings set org.gnome.shell enabled-extensions "['$THEME_UUID', '$DEVKIT_UUID']"
  gsettings set org.gnome.shell disable-extension-version-validation true
  gsettings set org.gnome.shell welcome-dialog-last-shown-version '999'
}

# Containers have no systemd: give GNOME Shell a system bus and a logind.
ensure_system_services() {
  if [ ! -S /run/dbus/system_bus_socket ] && [ "$(id -u)" = 0 ]; then
    mkdir -p /run/dbus && dbus-daemon --system --fork
  fi
  if ! gdbus introspect --system --dest org.freedesktop.login1 --object-path /org/freedesktop/login1 >/dev/null 2>&1; then
    gjs -m "$DEV_ROOT/headless/fake-logind.js" &
    FAKE_LOGIND_PID=$!
    export FAKE_LOGIND_PID
    sleep 1
  fi
}

stop_system_services() {
  [ -n "${FAKE_LOGIND_PID:-}" ] && kill "$FAKE_LOGIND_PID" 2>/dev/null
  return 0
}
