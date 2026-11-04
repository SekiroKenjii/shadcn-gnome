#!/usr/bin/env bash
# Launches the GTK/libadwaita reference apps inside the running sandbox.
#
#   dev/apps.sh [APP ...]     default: every installed app below
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
[ -f "$SANDBOX_ENV" ] || die "no sandbox is running; start dev/sandbox.sh first"
set -a
# shellcheck source=/dev/null
source "$SANDBOX_ENV"
set +a
unset DISPLAY

readonly REFERENCE_APPS=(
  gtk4-widget-factory
  adwaita-1-demo
  nautilus
  gnome-control-center
  ptyxis
  gnome-text-editor
  gtk3-widget-factory
)

apps=("$@")
[ "${#apps[@]}" -gt 0 ] || apps=("${REFERENCE_APPS[@]}")
for app in "${apps[@]}"; do
  if command -v "$app" >/dev/null; then
    GDK_BACKEND=wayland setsid "$app" >/dev/null 2>&1 &
    success "started $app"
  else
    warn "$app is not installed (dev/container/Containerfile ships all of them)"
  fi
done
