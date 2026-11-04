#!/usr/bin/env bash
# Headless visual check: installs the theme into a throwaway HOME, boots a
# virtual-monitor GNOME Shell and screenshots each scene for both schemes.
#
#   dev/headless/capture.sh [-t THEME] [--scheme dark|light|both] [--scenes a,b] [-- install flags]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
readonly REPO_ROOT ALL_SCENES=desktop,quick-settings,calendar,notification,overview,app-grid,osd,run-dialog,screenshot-ui,lock-screen

theme=graphite
schemes=(dark light)
scenes=$ALL_SCENES
install_args=(--icon --cursor --wallpaper --font)

while [ $# -gt 0 ]; do
  case "$1" in
    -t | --theme) theme="$2"; shift 2 ;;
    --scheme) [ "$2" = both ] || schemes=("$2"); shift 2 ;;
    --scenes) scenes="$2"; shift 2 ;;
    --) shift; install_args=("$@"); break ;;
    -h | --help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

for tool in gnome-shell dbus-run-session gdbus gsettings; do
  command -v "$tool" >/dev/null || { echo "missing $tool; use dev/container (toolbox) or install GNOME Shell" >&2; exit 1; }
done

# Containers have no systemd: provide a system bus and a stand-in logind.
if [ ! -S /run/dbus/system_bus_socket ] && [ "$(id -u)" = 0 ]; then
  mkdir -p /run/dbus && dbus-daemon --system --fork
fi
if ! gdbus introspect --system --dest org.freedesktop.login1 --object-path /org/freedesktop/login1 >/dev/null 2>&1; then
  gjs -m "$REPO_ROOT/dev/headless/fake-logind.js" &
  trap 'kill $! 2>/dev/null || true' EXIT
  sleep 1
fi

shots="$REPO_ROOT/build/screens/$theme"
mkdir -p "$shots"
for scheme in "${schemes[@]}"; do
  sandbox="$(mktemp -d)"
  runtime="$(mktemp -d)"
  chmod 700 "$runtime"
  env -i PATH="$PATH" HOME="$sandbox" XDG_RUNTIME_DIR="$runtime" LANG="${LANG:-C.UTF-8}" \
    REPO_ROOT="$REPO_ROOT" SHOTS_DIR="$shots" SCHEME="$scheme" SCENES="$scenes" \
    INSTALL_FLAGS="--theme $theme ${install_args[*]}" \
    dbus-run-session -- "$REPO_ROOT/dev/headless/session.sh" 2>&1 | grep -v '^dbus-daemon' || true
  rm -rf "$sandbox" "$runtime"
done
echo "screens in ${shots#"$REPO_ROOT"/}"
