#!/usr/bin/env bash
# Opens a Shell surface inside the running sandbox (dev/sandbox.sh).
#
#   dev/scenes.sh SCENE [--shot FILE]
#   dev/scenes.sh --list
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
[ -f "$SANDBOX_ENV" ] || die "no sandbox is running; start dev/sandbox.sh first"
set -a
# shellcheck source=/dev/null
source "$SANDBOX_ENV"
set +a

case "${1:-}" in
  "" | -h | --help) sed -n '2,5p' "$0"; exit 0 ;;
  --list) shell_eval 'shadcnDevkit.scenes.join(" ")'; exit 0 ;;
esac

show_scene "$1"
if [ "${2:-}" = --shot ]; then
  sleep 1.5
  shell_screenshot "$(realpath -m "${3:?--shot needs a file}")"
fi
