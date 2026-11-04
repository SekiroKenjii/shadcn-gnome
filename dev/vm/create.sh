#!/usr/bin/env bash
# Provisions a disposable GNOME VM for testing the real login screen
# (--gdm runs sudo, update-alternatives and dconf, which a container cannot).
#
#   dev/vm/create.sh [--distro ubuntu|fedora] [--release VERSION] [--image PATH_OR_URL] [--size 30G]
#
# The VM installs a desktop with cloud-init, then powers off; the provisioned
# disk is kept so dev/vm/reset.sh can always return to a clean greeter.
set -euo pipefail
# shellcheck source=dev/vm/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

distro=ubuntu
release=""
image=""
size=30G
while [ $# -gt 0 ]; do
  case "$1" in
    --distro) distro="$2"; shift 2 ;;
    --release) release="$2"; shift 2 ;;
    --image) image="$2"; shift 2 ;;
    --size) size="$2"; shift 2 ;;
    -h | --help) sed -n '2,9p' "$0"; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

for tool in qemu-system-x86_64 qemu-img ssh-keygen curl; do
  command -v "$tool" >/dev/null || die "missing $tool (install qemu-system-x86, qemu-utils, openssh-client, curl)"
done

default_image() {
  case "$distro" in
    ubuntu)
      local version="${release:-26.04}"
      echo "https://cloud-images.ubuntu.com/releases/$version/release/ubuntu-$version-server-cloudimg-amd64.img" ;;
    fedora)
      local version="${release:-43}" index file
      index="https://download.fedoraproject.org/pub/fedora/linux/releases/$version/Cloud/x86_64/images/"
      file="$(curl -fsSL "$index" | grep -oE 'Fedora-Cloud-Base-Generic-[^"]+\.qcow2' | head -n1)"
      [ -n "$file" ] || die "could not find a Fedora $version cloud image at $index"
      echo "$index$file" ;;
    *) die "--distro must be ubuntu or fedora" ;;
  esac
}

desktop_install_command() {
  case "$distro" in
    ubuntu) echo "DEBIAN_FRONTEND=noninteractive apt-get install -y ubuntu-desktop-minimal nodejs npm libglib2.0-dev-bin rsync" ;;
    fedora) echo "dnf -y group install workstation-product-environment && dnf -y install nodejs npm glib2-devel rsync" ;;
  esac
}

make_seed_iso() {
  local directory="$1" iso="$2"
  if command -v cloud-localds >/dev/null; then
    cloud-localds "$iso" "$directory/user-data" "$directory/meta-data"
  elif command -v xorriso >/dev/null; then
    xorriso -as genisoimage -quiet -output "$iso" -volid cidata -joliet -rock "$directory/user-data" "$directory/meta-data"
  elif command -v genisoimage >/dev/null; then
    genisoimage -quiet -output "$iso" -volid cidata -joliet -rock "$directory/user-data" "$directory/meta-data"
  else
    die "need cloud-localds, xorriso or genisoimage to build the cloud-init seed"
  fi
}

mkdir -p "$VM_DIR"
[ -f "$VM_KEY" ] || ssh-keygen -q -t ed25519 -N '' -f "$VM_KEY"
image="${image:-$(default_image)}"
cloud_image="$VM_DIR/$(basename "$image")"
if [[ "$image" == http* ]]; then
  [ -f "$cloud_image" ] || { log "downloading $image"; curl -fL --retry 3 -o "$cloud_image" "$image"; }
else
  cloud_image="$(realpath "$image")"
fi

log "creating a $size disk from $(basename "$cloud_image")"
rm -f "$VM_PROVISIONED" "$VM_OVERLAY"
qemu-img convert -O qcow2 "$cloud_image" "$VM_PROVISIONED"
qemu-img resize -q "$VM_PROVISIONED" "$size"

seed="$(mktemp -d)"
trap 'rm -rf "$seed"' EXIT
install_desktop="$(desktop_install_command)"
sed -e "s|@SSH_PUBLIC_KEY@|$(cat "$VM_KEY.pub")|" -e "s|@INSTALL_DESKTOP@|${install_desktop//&/\\&}|" \
  "$DEV_ROOT/vm/user-data.yaml" > "$seed/user-data"
printf 'instance-id: shadcn-gnome-%s\nlocal-hostname: shadcn-gnome-vm\n' "$(date +%s)" > "$seed/meta-data"
make_seed_iso "$seed" "$VM_DIR/seed.iso"

log "provisioning (installs a full desktop; takes a while, the VM powers off when done)"
# shellcheck disable=SC2046  # the accelerator flags are meant to split
qemu-system-x86_64 $(qemu_accelerator) -m "$VM_MEMORY" -smp "$VM_CPUS" \
  -drive file="$VM_PROVISIONED",if=virtio -drive file="$VM_DIR/seed.iso",media=cdrom \
  -nic user,model=virtio-net-pci -nographic -serial mon:stdio
success "provisioned $VM_PROVISIONED; start it with dev/vm/run.sh"
