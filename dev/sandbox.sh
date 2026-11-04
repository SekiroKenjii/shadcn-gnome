#!/usr/bin/env bash
# Interactive GNOME Shell in a window, with a throwaway HOME so nothing touches
# your real desktop. Shell, GTK, icons, cursors, fonts and wallpapers are all
# installed into the sandbox exactly as install.sh would.
#
#   dev/sandbox.sh [-t THEME] [--scheme dark|light] [--fresh] [--size 1440x900] [-- install flags]
#
# While it runs, drive it from another terminal:
#   dev/scenes.sh quick-settings     open a surface (see dev/scenes.sh --list)
#   dev/apps.sh                      launch GTK test apps inside the sandbox
#   dev/reload.sh                    rebuild and reload the Shell theme
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

theme=graphite
scheme=dark
size=1440x900
fresh=0
install_flags=(--icon --cursor --font --wallpaper --terminal)

while [ $# -gt 0 ]; do
  case "$1" in
    -t | --theme) theme="$2"; shift 2 ;;
    --scheme) scheme="$2"; shift 2 ;;
    --size) size="$2"; shift 2 ;;
    --fresh) fresh=1; shift ;;
    --) shift; install_flags=("$@"); break ;;
    -h | --help) sed -n '2,14p' "$0"; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

command -v gnome-shell >/dev/null || die "GNOME Shell is not installed here; use dev/toolbox.sh"
[ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ] || die "needs a graphical session to open the nested window (use dev/headless/capture.sh otherwise)"

sandbox_home="$SANDBOX_ROOT/home"
[ "$fresh" = 1 ] && rm -rf "$sandbox_home"
mkdir -p "$sandbox_home"
ensure_system_services
trap stop_system_services EXIT

log "sandbox HOME: ${sandbox_home#"$REPO_ROOT"/}"
env -i PATH="$PATH" HOME="$sandbox_home" LANG="${LANG:-C.UTF-8}" \
  XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" \
  WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" DISPLAY="${DISPLAY:-}" \
  THEME="$theme" SCHEME="$scheme" SIZE="$size" INSTALL_FLAGS="${install_flags[*]}" \
  dbus-run-session -- "$DEV_ROOT/lib/sandbox-session.sh"
rm -f "$SANDBOX_ENV"
