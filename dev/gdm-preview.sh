#!/usr/bin/env bash
# Previews the themed login screen without root and without touching the
# system: the greeter gresource is built and validated in build/, then a
# GNOME Shell in GDM mode runs in a window with that gresource bind-mounted
# over the distro one inside a private mount namespace (bubblewrap).
#
#   dev/gdm-preview.sh [-t THEME] [--scheme dark|light] [--build-only | --shot FILE]
#
# --shot runs the greeter chrome headless and saves a screenshot (works in
# containers and CI). Without a running GDM daemon the login prompt itself may
# not appear there; the windowed preview and the VM show the full greeter.
#
# The real install path (sudo, update-alternatives, dconf) is exercised in the
# VM: see dev/vm/README.md.
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

theme=graphite
scheme=dark
build_only=0
shot=""
while [ $# -gt 0 ]; do
  case "$1" in
    -t | --theme) theme="$2"; shift 2 ;;
    --scheme) scheme="$2"; shift 2 ;;
    --build-only) build_only=1; shift ;;
    --shot) shot="$(realpath -m "$2")"; shift 2 ;;
    -h | --help) sed -n '2,14p' "$0"; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

system_gresource="$(readlink -f /usr/share/gnome-shell/gnome-shell-theme.gresource)"
[ -f "$system_gresource" ] || die "no GNOME Shell theme gresource on this system"

node "$REPO_ROOT/bin/shadcn-gnome.mjs" build --theme "$theme" --target gdm --quiet
fragments="$REPO_ROOT/build/$theme/gdm"
preview="$fragments/preview.gresource"
bash "$REPO_ROOT/installer/gdm-helper.sh" build --theme "$theme" --base "$system_gresource" --out "$preview" \
  --fragment-dark "$fragments/greeter-dark.css" --fragment-light "$fragments/greeter-light.css"
[ "$build_only" = 1 ] && exit 0

command -v bwrap >/dev/null || die "bubblewrap (bwrap) is needed for the live preview; --build-only still validates the gresource"
[ -n "$shot" ] || [ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ] || die "needs a graphical session (or use --shot FILE)"
ensure_system_services

preview_home="$(mktemp -d)"
trap 'rm -rf "$preview_home"; stop_system_services' EXIT
mkdir -p "$preview_home/modes/gnome-shell/modes" "$preview_home/.local/share/gnome-shell/extensions"
cp -r "$DEV_ROOT/headless/$DEVKIT_UUID" "$preview_home/.local/share/gnome-shell/extensions/"
printf '{"parentMode": "gdm", "enabledExtensions": ["%s"]}\n' "$DEVKIT_UUID" \
  > "$preview_home/modes/gnome-shell/modes/shadcn-greeter-preview.json"

if [ -n "$shot" ]; then
  display=(--headless --virtual-monitor 1440x900)
else
  display=("$(nested_shell_flag)" --wayland-display shadcn-greeter)
fi

log "starting the greeter preview ($scheme)"
runtime="$(mktemp -d)"
chmod 700 "$runtime"
bwrap --dev-bind / / --bind "$preview" "$system_gresource" -- \
  env -i PATH="$PATH" HOME="$preview_home" XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$runtime}" LANG="${LANG:-C.UTF-8}" \
  WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" DISPLAY="${DISPLAY:-}" \
  XDG_DATA_DIRS="$preview_home/modes:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}" \
  SCHEME="$scheme" SHOT="$shot" DISPLAY_FLAGS="${display[*]}" \
  dbus-run-session -- "$DEV_ROOT/lib/greeter-session.sh"
rm -rf "$runtime"
[ -z "$shot" ] || success "greeter screenshot: $shot"
