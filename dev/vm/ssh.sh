#!/usr/bin/env bash
# Opens a shell in the running VM, or runs a command there.
#
#   dev/vm/ssh.sh [COMMAND]
set -euo pipefail
# shellcheck source=dev/vm/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
vm_ssh "$@"
