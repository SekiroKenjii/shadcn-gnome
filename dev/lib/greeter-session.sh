#!/usr/bin/env bash
# Runs inside the greeter preview's D-Bus session (see dev/gdm-preview.sh).
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
: "${SCHEME:?}" "${DISPLAY_FLAGS:?}" "${SHOT?}"

gsettings set org.gnome.desktop.interface color-scheme "prefer-$SCHEME"
read -r -a display_flags <<< "$DISPLAY_FLAGS"

if [ -z "$SHOT" ]; then
  exec gnome-shell "${display_flags[@]}" --wayland --no-x11 --mode=gdm
fi

# Screenshots need the devkit extension, which only loads through a custom
# session mode derived from gdm.

gnome-shell "${display_flags[@]}" --wayland --no-x11 --mode=shadcn-greeter-preview > "${SHOT%.png}.log" 2>&1 &
shell_pid=$!
trap 'kill "$shell_pid" 2>/dev/null || true; wait "$shell_pid" 2>/dev/null || true' EXIT
wait_for_devkit || die "the greeter did not start; see ${SHOT%.png}.log"
shell_eval "shadcnDevkit.show('greeter')" >/dev/null || true
sleep 4
shell_screenshot "$SHOT"
