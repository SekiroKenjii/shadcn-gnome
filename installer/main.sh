#!/usr/bin/env bash
# Entry point behind install.sh and uninstall.sh. Each surface lives in
# installer/components/<name>.sh and exposes component_<name>_{targets,install,uninstall}.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
readonly REPO_ROOT

for library in log paths platform state; do
  # shellcheck source=/dev/null
  source "$REPO_ROOT/installer/lib/$library.sh"
done
for component in "$REPO_ROOT"/installer/components/*.sh; do
  # shellcheck source=/dev/null
  source "$component"
done

readonly ALWAYS_INSTALLED=(gtk shell)
readonly OPTIONAL_COMPONENTS=(icons cursors fonts wallpapers terminal firefox vitals gdm)
readonly EVERYDAY_COMPONENTS=(icons cursors fonts wallpapers terminal)

THEME=graphite
SCHEME=dark
CURSOR_VARIANT=light
DARK_PANEL=0
SELECTED=()

usage() {
  cat <<'USAGE'
Install a shadcn desktop for GNOME (Debian/Ubuntu/Fedora, GNOME 47+).

Usage: ./install.sh [options]

  -t, --theme NAME       graphite (default) | mono | vercel  (any file in themes/)
  -s, --scheme SCHEME    dark (default) | light: the starting color scheme
      --dark-panel       keep the top bar dark in the light scheme
  -a, --all              icons, cursors, fonts, wallpapers and terminal
  -i, --icon             Lucide icon theme
  -c, --cursor[=VARIANT] SVG cursor theme; VARIANT light (default) or dark
  -f, --font             Geist and Geist Mono
  -w, --wallpaper        theme wallpaper (light + dark)
      --terminal         Ptyxis palette
      --firefox          Firefox chrome
      --patch-vitals     recolor the Vitals extension icons
      --gdm              login screen (needs sudo; reversible)
  -h, --help             show this help

GTK4/GTK3 and the GNOME Shell theme are always installed.
./uninstall.sh reverts everything, including the settings changed here.
USAGE
}

select_component() {
  local wanted="$1" existing
  for existing in "${SELECTED[@]}"; do [ "$existing" = "$wanted" ] && return 0; done
  SELECTED+=("$wanted")
}

parse_install_options() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -t | --theme) THEME="${2:?--theme needs a name}"; shift 2 ;;
      --theme=*) THEME="${1#*=}"; shift ;;
      -s | --scheme) SCHEME="${2:?--scheme needs dark or light}"; shift 2 ;;
      --scheme=*) SCHEME="${1#*=}"; shift ;;
      --dark-panel) DARK_PANEL=1; shift ;;
      -a | --all) for c in "${EVERYDAY_COMPONENTS[@]}"; do select_component "$c"; done; shift ;;
      -i | --icon | --icons) select_component icons; shift ;;
      -c | --cursor | --cursors) select_component cursors; shift ;;
      --cursor=*) select_component cursors; CURSOR_VARIANT="${1#*=}"; shift ;;
      -f | --font | --fonts) select_component fonts; shift ;;
      -w | --wallpaper | --wallpapers) select_component wallpapers; shift ;;
      --terminal) select_component terminal; shift ;;
      --firefox) select_component firefox; shift ;;
      --patch-vitals) select_component vitals; shift ;;
      --gdm) select_component gdm; shift ;;
      -h | --help) usage; exit 0 ;;
      *) usage >&2; die "unknown option: $1" ;;
    esac
  done
  case "$SCHEME" in dark | light) ;; *) die "--scheme must be dark or light" ;; esac
  case "$CURSOR_VARIANT" in dark | light) ;; *) die "--cursor variant must be dark or light" ;; esac
  [ -f "$REPO_ROOT/themes/$THEME.json" ] || die "unknown theme '$THEME' (available: $(available_themes))"
}

available_themes() {
  local file names=()
  for file in "$REPO_ROOT"/themes/*.json; do
    [ "$(basename "$file")" = schema.json ] || names+=("$(basename "$file" .json)")
  done
  echo "${names[*]}"
}

is_selected() {
  local candidate
  for candidate in "${SELECTED[@]}"; do [ "$candidate" = "$1" ] && return 0; done
  return 1
}

sg_cli() {
  node "$REPO_ROOT/bin/shadcn-gnome.mjs" "$@"
}

theme_field() {
  sg_cli field "$1" --theme "$THEME"
}

required_commands() {
  local commands=(node npm gsettings dconf)
  is_selected icons && commands+=(gtk-update-icon-cache)
  is_selected fonts && commands+=(fc-cache)
  is_selected gdm && commands+=(gresource glib-compile-resources)
  printf '%s\n' "${commands[@]}"
}

build_targets() {
  local component targets=()
  for component in "${ALWAYS_INSTALLED[@]}" "${SELECTED[@]}"; do
    mapfile -t -O "${#targets[@]}" targets < <("component_${component}_targets")
  done
  printf '%s\n' "${targets[@]}" | sort -u | paste -sd, -
}

prepare_build() {
  local arguments=(build --theme "$THEME" --target "$(build_targets)" --quiet)
  [ "$DARK_PANEL" = 1 ] && arguments+=(--dark-panel)
  if [ ! -d "$REPO_ROOT/node_modules/sass" ] || [ "$REPO_ROOT/package-lock.json" -nt "$REPO_ROOT/node_modules/.package-lock.json" ]; then
    log "installing build dependencies (npm)"
    (cd "$REPO_ROOT" && npm ci --omit=dev --no-audit --no-fund >/dev/null) || die "npm ci failed"
  fi
  log "building $(theme_field label) ($(build_targets))"
  sg_cli "${arguments[@]}"
}

warn_about_old_shell() {
  local version
  command -v gnome-shell >/dev/null || return 0
  version="$(gnome_shell_major_version)"
  if [ -n "$version" ] && [ "$version" -lt 47 ]; then
    warn "GNOME Shell $version detected; the theme targets 47+ and light/dark switching needs 47+"
  fi
}

install_main() {
  parse_install_options "$@"
  mapfile -t needed < <(required_commands)
  ensure_commands "${needed[@]}"
  require_commands node npm gsettings
  warn_about_old_shell

  BUILD_DIR="$REPO_ROOT/build/$THEME"
  WITH_CURSORS=0 WITH_ICONS=0 WITH_FONTS=0
  is_selected cursors && WITH_CURSORS=1
  is_selected icons && WITH_ICONS=1
  is_selected fonts && WITH_FONTS=1
  export BUILD_DIR WITH_CURSORS WITH_ICONS WITH_FONTS
  prepare_build

  local component
  for component in "${ALWAYS_INSTALLED[@]}" "${SELECTED[@]}"; do
    "component_${component}_install"
  done
  printf '%s\n' "$THEME" > "$STATE_DIR/theme"

  echo
  log "done: $(theme_field label) installed with the $SCHEME scheme."
  log "log out and back in once so GNOME Shell loads the theme extension."
}

uninstall_main() {
  case "${1:-}" in -h | --help) echo "Usage: ./uninstall.sh  (reverts every shadcn-gnome surface and setting)"; exit 0 ;; esac
  local component
  for component in "${OPTIONAL_COMPONENTS[@]}" "${ALWAYS_INSTALLED[@]}"; do
    "component_${component}_uninstall"
  done
  restore_settings
  rm -rf "$STATE_DIR"
  echo
  log "done: shadcn-gnome removed and your previous settings restored. Log out and back in to finish."
}

case "${1:-}" in
  install) shift; install_main "$@" ;;
  uninstall) shift; uninstall_main "$@" ;;
  *) die "usage: installer/main.sh install|uninstall [options]" ;;
esac
