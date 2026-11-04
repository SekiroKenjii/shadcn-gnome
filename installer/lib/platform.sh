# shellcheck shell=bash

detect_package_manager() {
  if command -v apt-get >/dev/null; then echo apt
  elif command -v dnf >/dev/null; then echo dnf
  else echo unknown
  fi
}

PACKAGE_MANAGER="$(detect_package_manager)"
SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null; then SUDO="sudo"; fi

package_providing() {
  case "$PACKAGE_MANAGER:$1" in
    apt:node | dnf:node) echo nodejs ;;
    apt:npm | dnf:npm) echo npm ;;
    apt:gsettings | apt:gresource) echo libglib2.0-bin ;;
    dnf:gsettings | dnf:gresource) echo glib2 ;;
    apt:glib-compile-resources) echo libglib2.0-dev-bin ;;
    dnf:glib-compile-resources) echo glib2-devel ;;
    apt:dconf) echo dconf-cli ;;
    dnf:dconf) echo dconf ;;
    apt:fc-cache | dnf:fc-cache) echo fontconfig ;;
    apt:gtk-update-icon-cache) echo libgtk-3-bin ;;
    dnf:gtk-update-icon-cache) echo gtk-update-icon-cache ;;
    apt:gnome-extensions) echo gnome-shell-extension-prefs ;;
    dnf:gnome-extensions) echo gnome-shell ;;
    *) echo "" ;;
  esac
}

install_packages() {
  [ $# -gt 0 ] || return 0
  case "$PACKAGE_MANAGER" in
    apt) $SUDO apt-get update -qq && $SUDO apt-get install -y "$@" ;;
    dnf) $SUDO dnf install -y "$@" ;;
    *) return 1 ;;
  esac
}

ensure_commands() {
  local command package missing=() packages=()
  for command in "$@"; do
    command -v "$command" >/dev/null && continue
    missing+=("$command")
    package="$(package_providing "$command")"
    [ -n "$package" ] && packages+=("$package")
  done
  [ "${#missing[@]}" -eq 0 ] && return 0

  log "installing missing tools: ${missing[*]}"
  if [ "$PACKAGE_MANAGER" = unknown ]; then
    warn "no supported package manager (apt/dnf); install manually: ${missing[*]}"
    return 0
  fi
  mapfile -t packages < <(printf '%s\n' "${packages[@]}" | sort -u)
  install_packages "${packages[@]}" || warn "package installation reported an error; continuing"
}

require_commands() {
  local command
  for command in "$@"; do
    command -v "$command" >/dev/null || die "missing required command: $command"
  done
}

gnome_shell_major_version() {
  local version
  version="$(gnome-shell --version 2>/dev/null || true)"
  version="${version//[!0-9.]/}"
  echo "${version%%.*}"
}
