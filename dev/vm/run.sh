#!/usr/bin/env bash
# Boots the GDM test VM in a window. Changes go to a throwaway overlay, so
# dev/vm/reset.sh returns to the freshly provisioned greeter.
#
#   dev/vm/run.sh [--headless]
set -euo pipefail
# shellcheck source=dev/vm/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

[ -f "$VM_PROVISIONED" ] || die "no VM yet; run dev/vm/create.sh first"
[ -f "$VM_OVERLAY" ] || qemu-img create -q -f qcow2 -b "$VM_PROVISIONED" -F qcow2 "$VM_OVERLAY"

display=(-device virtio-vga -display "${VM_DISPLAY:-gtk}")
[ "${1:-}" = --headless ] && display=(-display none -vnc 127.0.0.1:1)

log "ssh: dev/vm/ssh.sh · sync the repo: dev/vm/sync.sh · user/password: $VM_USER/$VM_USER"
# shellcheck disable=SC2046  # the accelerator flags are meant to split
exec qemu-system-x86_64 $(qemu_accelerator) -m "$VM_MEMORY" -smp "$VM_CPUS" \
  -drive file="$VM_OVERLAY",if=virtio \
  -nic user,model=virtio-net-pci,hostfwd=tcp:127.0.0.1:"$VM_SSH_PORT"-:22 \
  -device qemu-xhci -device usb-tablet \
  "${display[@]}"
