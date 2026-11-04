#!/usr/bin/env bash
# Rebuilds the theme and reloads it in the running sandbox without restarting.
#
#   dev/reload.sh [TARGETS]    default: gtk,shell
set -euo pipefail
# shellcheck source=dev/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
[ -f "$SANDBOX_ENV" ] || die "no sandbox is running; start dev/sandbox.sh first"
set -a
# shellcheck source=/dev/null
source "$SANDBOX_ENV"
set +a

targets="${1:-gtk,shell}"
node "$REPO_ROOT/bin/shadcn-gnome.mjs" build --theme "$THEME" --target "$targets" --quiet
build="$REPO_ROOT/build/$THEME"
extension="$HOME/.local/share/gnome-shell/extensions/$THEME_UUID"
if [[ "$targets" == *shell* ]]; then
  cp "$build/gnome-shell/$THEME_UUID/"*.css "$extension/"
  shell_eval "Main.extensionManager.lookup('$THEME_UUID').stateObj._applyShellStylesheet()" >/dev/null
  success "Shell stylesheet reloaded"
fi
if [[ "$targets" == *gtk* ]]; then
  cp "$build/gtk-4.0/gtk.css" "$HOME/.config/gtk-4.0/gtk.css"
  success "GTK4 stylesheet copied; GTK reloads it on the next app start (or toggle Dark Style)"
fi
