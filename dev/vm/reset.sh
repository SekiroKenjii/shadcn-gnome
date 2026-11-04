#!/usr/bin/env bash
# Discards everything done in the VM since provisioning (stop the VM first).
#
#   dev/vm/reset.sh
set -euo pipefail
# shellcheck source=dev/vm/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
rm -f "$VM_OVERLAY"
success "the next dev/vm/run.sh starts from the clean provisioned greeter"
