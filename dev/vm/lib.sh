# shellcheck shell=bash
# shellcheck disable=SC2034  # read by the scripts that source this file
# Shared settings for the GDM test VM scripts.

# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/common.sh"

VM_DIR="${VM_DIR:-$REPO_ROOT/build/vm}"
VM_SSH_PORT="${VM_SSH_PORT:-2222}"
VM_USER=shadcn
VM_MEMORY="${VM_MEMORY:-4096}"
VM_CPUS="${VM_CPUS:-4}"
VM_KEY="$VM_DIR/id_ed25519"
VM_PROVISIONED="$VM_DIR/provisioned.qcow2"
VM_OVERLAY="$VM_DIR/session.qcow2"

vm_ssh() {
  ssh -i "$VM_KEY" -p "$VM_SSH_PORT" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o LogLevel=ERROR "$VM_USER@127.0.0.1" "$@"
}

qemu_accelerator() {
  if [ -w /dev/kvm ]; then echo "-accel kvm -cpu host"; else echo "-accel tcg"; fi
}
