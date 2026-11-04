#!/usr/bin/env bash
# Runs inside the sandbox's private D-Bus session (see dev/sandbox.sh).
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
: "${THEME:?}" "${SCHEME:?}" "${SIZE:?}" "${INSTALL_FLAGS?}"

read -r -a install_flags <<< "$INSTALL_FLAGS"
"$REPO_ROOT/install.sh" --theme "$THEME" --scheme "$SCHEME" "${install_flags[@]}"
prepare_sandbox_extensions

printf 'DBUS_SESSION_BUS_ADDRESS=%q\nWAYLAND_DISPLAY=%q\nXDG_RUNTIME_DIR=%q\nHOME=%q\nTHEME=%q\n' \
  "$DBUS_SESSION_BUS_ADDRESS" "$NESTED_DISPLAY" "$XDG_RUNTIME_DIR" "$HOME" "$THEME" > "$SANDBOX_ENV"

MUTTER_DEBUG_DUMMY_MODE_SPECS="$SIZE" exec gnome-shell "$(nested_shell_flag)" --wayland \
  --wayland-display "$NESTED_DISPLAY" --no-x11
