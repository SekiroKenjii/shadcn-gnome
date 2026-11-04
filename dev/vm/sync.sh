#!/usr/bin/env bash
# Copies the working tree (without build output) into the running VM.
#
#   dev/vm/sync.sh
set -euo pipefail
# shellcheck source=dev/vm/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

rsync -az --delete --exclude node_modules --exclude build --exclude .git \
  -e "ssh -i $VM_KEY -p $VM_SSH_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR" \
  "$REPO_ROOT/" "$VM_USER@127.0.0.1:shadcn-gnome/"
success "synced to ~/shadcn-gnome in the VM (then: dev/vm/ssh.sh 'cd shadcn-gnome && ./install.sh --gdm --all')"
