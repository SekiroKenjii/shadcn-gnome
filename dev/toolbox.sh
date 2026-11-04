#!/usr/bin/env bash
# Builds the development container and enters it with toolbox or distrobox,
# so the latest GNOME Shell runs nested on any host desktop.
#
#   dev/toolbox.sh            build (first run) and enter
#   dev/toolbox.sh --rebuild  rebuild the image and recreate the container
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

readonly IMAGE=localhost/shadcn-gnome-dev:latest
readonly CONTAINER=shadcn-gnome-dev

engine="$(command -v podman || command -v docker || true)"
[ -n "$engine" ] || die "podman (or docker) is required"

if [ "${1:-}" = --rebuild ] || ! "$engine" image exists "$IMAGE" 2>/dev/null; then
  log "building $IMAGE"
  "$engine" build -t "$IMAGE" -f "$DEV_ROOT/container/Containerfile" "$DEV_ROOT/container"
  if command -v toolbox >/dev/null; then toolbox rm -f "$CONTAINER" >/dev/null 2>&1 || true; fi
  if command -v distrobox >/dev/null; then distrobox rm -f "$CONTAINER" >/dev/null 2>&1 || true; fi
fi

if command -v toolbox >/dev/null; then
  toolbox create --image "$IMAGE" "$CONTAINER" >/dev/null 2>&1 || true
  exec toolbox enter "$CONTAINER"
elif command -v distrobox >/dev/null; then
  distrobox create --image "$IMAGE" --name "$CONTAINER" --yes >/dev/null 2>&1 || true
  exec distrobox enter "$CONTAINER"
else
  warn "neither toolbox nor distrobox found; opening a plain container (headless tools only)"
  exec "$engine" run --rm -it -v "$REPO_ROOT:$REPO_ROOT:Z" -w "$REPO_ROOT" "$IMAGE" bash
fi
