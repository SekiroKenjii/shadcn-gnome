#!/usr/bin/env bash
# install.sh: install a shadcn desktop theme for GNOME (Debian/Ubuntu/Fedora,
# GNOME 50+). The theme (GTK4/GTK3 + GNOME Shell) is always applied; icons,
# terminal palette and the Geist font are opt-in flags. Idempotent.
#
# Usage:
#   ./install.sh [-t THEME] [-i] [--terminal] [-f]
#
#   -t, --theme <name>   graphite (default) | mono | vercel  (any file in themes/)
#   -i, --icon           generate + apply the Lucide icon set for the theme
#       --terminal       install + apply the Ptyxis terminal palette
#   -f, --font           install + apply the Geist font
#   -h, --help           show this help
#
# All colours live in themes/<name>.json and all other static assets under
# assets/. Edit those, not this script.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$REPO"

# --- pretty output ----------------------------------------------------------
log()  { printf '\033[34m::\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31mxx\033[0m %s\n' "$*" >&2; exit 1; }

# --- args -------------------------------------------------------------------
THEME=graphite
DO_ICON=0 DO_TERMINAL=0 DO_FONT=0 DO_GDM=0 DO_VITALS=0 DO_FIREFOX=0
usage() {
  cat <<'EOF'
install.sh: install a shadcn desktop theme for GNOME (Debian/Ubuntu/Fedora, GNOME 50+)

Usage: ./install.sh [-t THEME] [-i] [--terminal] [-f] [--gdm] [--patch-vitals] [--firefox]

  -t, --theme <name>   graphite (default) | mono | vercel  (any file in themes/)
  -i, --icon           generate + apply the Lucide icon set for the theme
      --terminal       install + apply the Ptyxis terminal palette
  -f, --font           install + apply the Geist font
      --gdm            theme the GDM login screen (needs sudo; reversible)
      --patch-vitals   recolour the Vitals extension's bundled icons to match
      --firefox        apply the theme to the Firefox browser chrome
  -h, --help           show this help

The theme (GTK4/GTK3 + GNOME Shell) is always applied; every other surface is
opt-in. All colours live in themes/<name>.json; other assets under assets/.
EOF
  exit "${1:-0}"
}
while [ $# -gt 0 ]; do
  case "$1" in
    -t|--theme)      THEME="${2:?--theme needs a name}"; shift 2 ;;
    --theme=*)       THEME="${1#*=}"; shift ;;
    -i|--icon)       DO_ICON=1; shift ;;
    --terminal)      DO_TERMINAL=1; shift ;;
    -f|--font)       DO_FONT=1; shift ;;
    --gdm)           DO_GDM=1; shift ;;
    --patch-vitals)  DO_VITALS=1; shift ;;
    --firefox)       DO_FIREFOX=1; shift ;;
    -h|--help)       usage 0 ;;
    *)               warn "unknown option: $1"; usage 1 ;;
  esac
done

THEME_FILE="$REPO/themes/$THEME.json"
[ -f "$THEME_FILE" ] || die "unknown theme '$THEME'. Available: $(cd themes && ls *.json 2>/dev/null | sed 's/\.json//' | tr '\n' ' ')"

# ============================================================================
# 1. dependencies: detect the package manager and install what's missing
# ============================================================================
if   command -v apt-get >/dev/null; then PM=apt
elif command -v dnf     >/dev/null; then PM=dnf
else PM=unknown; fi

# binary -> package name for the detected manager
pkg_for() {
  case "$PM:$1" in
    apt:node) echo nodejs ;;      dnf:node) echo nodejs ;;
    apt:npm)  echo npm ;;         dnf:npm)  echo npm ;;
    apt:gsettings) echo libglib2.0-bin ;; dnf:gsettings) echo glib2 ;;
    apt:dconf) echo dconf-cli ;;  dnf:dconf) echo dconf ;;
    apt:fc-cache) echo fontconfig ;; dnf:fc-cache) echo fontconfig ;;
    apt:gtk-update-icon-cache) echo libgtk-3-bin ;; dnf:gtk-update-icon-cache) echo gtk-update-icon-cache ;;
    apt:gnome-extensions) echo gnome-shell-extensions ;; dnf:gnome-extensions) echo gnome-shell-extension-user-theme ;;
    apt:gresource) echo libglib2.0-bin ;; dnf:gresource) echo glib2 ;;
    *) echo "" ;;
  esac
}

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null && SUDO="sudo" || SUDO=""
fi

pm_install() { # pm_install pkg...
  [ $# -gt 0 ] || return 0
  case "$PM" in
    apt) $SUDO apt-get update -qq && $SUDO apt-get install -y "$@" ;;
    dnf) $SUDO dnf install -y "$@" ;;
    *)   return 1 ;;
  esac
}
pm_install_any() { # try each pkg individually; succeed on the first that installs
  local p
  for p in "$@"; do
    case "$PM" in
      apt) $SUDO apt-get install -y "$p" >/dev/null 2>&1 && return 0 ;;
      dnf) $SUDO dnf install -y "$p" >/dev/null 2>&1 && return 0 ;;
    esac
  done
  return 1
}

# figure out which binaries this run needs, then install any that are missing
NEED_BINS=(node npm gsettings dconf)
[ "$DO_FONT" = 1 ] && NEED_BINS+=(fc-cache)
[ "$DO_ICON" = 1 ] && NEED_BINS+=(gtk-update-icon-cache)
[ "$DO_GDM"  = 1 ] && NEED_BINS+=(gresource)

missing_pkgs=()
missing_bins=()
for bin in "${NEED_BINS[@]}"; do
  command -v "$bin" >/dev/null && continue
  missing_bins+=("$bin")
  p="$(pkg_for "$bin")"
  [ -n "$p" ] && missing_pkgs+=("$p")
done

if [ "${#missing_bins[@]}" -gt 0 ]; then
  log "resolving dependencies: ${missing_bins[*]}"
  if [ "$PM" = unknown ]; then
    warn "no supported package manager (apt/dnf); install manually: ${missing_bins[*]}"
  else
    # de-duplicate package list
    uniq_pkgs=$(printf '%s\n' "${missing_pkgs[@]}" | sort -u | tr '\n' ' ')
    log "installing packages ($PM): $uniq_pkgs"
    # shellcheck disable=SC2086
    pm_install $uniq_pkgs || warn "package install reported an error; continuing"
  fi
fi

# node/npm are mandatory to build
for bin in node npm; do
  command -v "$bin" >/dev/null || die "missing required dependency: $bin (install it and re-run)"
done

# GNOME version advisory (theme targets 50+)
if command -v gnome-shell >/dev/null; then
  GV="$(gnome-shell --version 2>/dev/null | grep -oE '[0-9]+' | head -1)"
  [ -n "$GV" ] && [ "$GV" -lt 50 ] 2>/dev/null && \
    warn "GNOME Shell $GV detected; this theme targets 50+. It should still apply, but the Shell theme may differ."
fi

# read fields out of the theme resource (single source of truth)
theme_field() { node -e 'const t=require(process.argv[1]);process.stdout.write(String(t[process.argv[2]]??""))' "$THEME_FILE" "$1"; }
LABEL="$(theme_field label)";      [ -n "$LABEL" ] || LABEL="Shadcn ${THEME^}"
FONT_NAME="$(theme_field fontSans)"; [ -n "$FONT_NAME" ] || FONT_NAME="Geist 11"
THEME_TITLE="${LABEL// /-}"          # "Shadcn Graphite" -> "Shadcn-Graphite"
BUILD="$REPO/build/$THEME"

# ============================================================================
# 2. npm deps + generate the theme surfaces
# ============================================================================
log "installing npm deps (lucide-static, @tabler/icons, svg-path-properties)"
npm install --no-audit --no-fund >/dev/null 2>&1 || die "npm install failed"

log "generating '$LABEL' theme surfaces (gtk4/gtk3/shell/ptyxis)"
node "$REPO/lib/build-theme.mjs" "$THEME" >/dev/null

# ============================================================================
# 3. GTK4 / GTK3 css (real files; overwrite any symlink)
# ============================================================================
log "installing GTK css"
for v in 3.0 4.0; do
  d="$HOME/.config/gtk-$v"; mkdir -p "$d"
  rm -f "$d/gtk.css"
  cp "$BUILD/gtk-$v/gtk.css" "$d/gtk.css"
done

# ============================================================================
# 4. GNOME Shell theme (base dark theme + our override, via User Themes)
# ============================================================================
install_shell_theme() {
  local dest="$HOME/.themes/$THEME_TITLE/gnome-shell"
  local base
  base="$(find_shell_base)" || { warn "no base GNOME Shell theme found; skipping Shell theme (GTK/icons/terminal still apply)"; return 0; }
  log "installing GNOME Shell theme '$THEME_TITLE' (base: $base)"
  rm -rf "$HOME/.themes/$THEME_TITLE"; mkdir -p "$dest"
  cp -r "$base/." "$dest/"
  cat "$BUILD/shell/gnome-shell.css" >> "$dest/gnome-shell.css"

  # enable User Themes extension + point it at our theme (dconf schema lives in the ext)
  local uuid="user-theme@gnome-shell-extensions.gcampax.github.com"
  if command -v gnome-extensions >/dev/null; then
    gnome-extensions list 2>/dev/null | grep -q "$uuid" || pm_install "$(pkg_for gnome-extensions)" >/dev/null 2>&1 || true
    gnome-extensions enable "$uuid" 2>/dev/null || true
  fi
  if gnome-extensions list 2>/dev/null | grep -q user-theme; then
    dconf write /org/gnome/shell/extensions/user-theme/name "''"
    dconf write /org/gnome/shell/extensions/user-theme/name "'$THEME_TITLE'"
  else
    warn "User Themes extension not enabled; enable it, then set the theme to '$THEME_TITLE'"
  fi
}
# echo a directory that contains a complete gnome-shell.css to use as the base
find_shell_base() {
  local c
  for c in \
    /usr/share/gnome-shell/theme/Yaru-dark \
    /usr/share/themes/Yaru-dark/gnome-shell \
    /usr/share/themes/Adwaita-dark/gnome-shell; do
    [ -f "$c/gnome-shell.css" ] && { echo "$c"; return 0; }
  done
  # any *-dark theme that ships a shell stylesheet (dark only, never a light
  # or HighContrast base, which would clash with the prefer-dark desktop)
  for c in /usr/share/themes/*-dark/gnome-shell; do
    [ -f "$c/gnome-shell.css" ] && { echo "$c"; return 0; }
  done
  # Fedora & co. ship the default shell theme inside a gresource, so extract it
  extract_shell_base_from_gresource && return 0
  return 1
}
# best-effort: rebuild a base dir from the compiled gnome-shell gresource
extract_shell_base_from_gresource() {
  command -v gresource >/dev/null || return 1
  local lib res out="$REPO/build/_shell-base"
  for lib in /usr/lib64/gnome-shell/libgnome-shell.so /usr/lib/gnome-shell/libgnome-shell.so \
             /usr/lib64/gnome-shell/libgnome-shell.so.0 /usr/lib/*/gnome-shell/libgnome-shell.so; do
    [ -f "$lib" ] || continue
    gresource list "$lib" 2>/dev/null | grep -q '/org/gnome/shell/theme/' || continue
    rm -rf "$out"; mkdir -p "$out"
    while IFS= read -r res; do
      case "$res" in */theme/*) : ;; *) continue ;; esac
      local rel="${res##*/theme/}"
      mkdir -p "$out/$(dirname "$rel")"
      gresource extract "$lib" "$res" > "$out/$rel" 2>/dev/null || true
    done < <(gresource list "$lib" 2>/dev/null)
    # prefer the dark stylesheet as gnome-shell.css
    if [ -f "$out/gnome-shell-dark.css" ]; then cp "$out/gnome-shell-dark.css" "$out/gnome-shell.css"; fi
    [ -f "$out/gnome-shell.css" ] && { echo "$out"; return 0; }
  done
  return 1
}
install_shell_theme

# ============================================================================
# 5. base interface settings (theme is neutral / dark-first)
# ============================================================================
log "applying interface settings"
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
if [ -d /usr/share/themes/Yaru-dark ]; then
  gsettings set org.gnome.desktop.interface gtk-theme 'Yaru-dark'
else
  gsettings set org.gnome.desktop.interface gtk-theme 'Adwaita-dark'
fi
gsettings set org.gnome.desktop.interface accent-color 'slate' 2>/dev/null || true

# ============================================================================
# 6. optional: Geist font (-f / --font)
# ============================================================================
if [ "$DO_FONT" = 1 ]; then
  log "installing Geist fonts"
  mkdir -p "$HOME/.local/share/fonts/geist"
  cp "$REPO/assets/fonts/"*.ttf "$HOME/.local/share/fonts/geist/"
  fc-cache -f "$HOME/.local/share/fonts/geist" >/dev/null 2>&1 || true
  gsettings set org.gnome.desktop.interface font-name "$FONT_NAME"
fi

# ============================================================================
# 7. optional: Lucide icon theme (-i / --icon)
# ============================================================================
if [ "$DO_ICON" = 1 ]; then
  log "generating Lucide icon theme for '$LABEL'"
  node "$REPO/lib/generate-icons.mjs" "$THEME"
  log "installing Lucide icon theme ($(find "$BUILD/Lucide" -name '*.svg' | wc -l) svgs)"
  rm -rf "$HOME/.local/share/icons/Lucide"
  cp -r "$BUILD/Lucide" "$HOME/.local/share/icons/Lucide"
  command -v gtk-update-icon-cache >/dev/null 2>&1 && \
    gtk-update-icon-cache -q -f -t "$HOME/.local/share/icons/Lucide" 2>/dev/null || true
  gsettings set org.gnome.desktop.interface icon-theme 'Lucide'

  # snap apps that hardcode an absolute Icon= path need a .desktop override
  bash "$REPO/scripts/patch-desktop-icons.sh" || true
fi

# ============================================================================
# 7b. optional: patch the Vitals extension's bundled icons (--patch-vitals)
#     Vitals loads its own icons, so it does not follow the icon theme.
# ============================================================================
if [ "$DO_VITALS" = 1 ]; then
  VIT_DIR="$HOME/.local/share/gnome-shell/extensions/Vitals@CoreCoding.com"
  if [ -d "$VIT_DIR" ]; then
    log "patching Vitals extension icons"
    node "$REPO/lib/patch-vitals.mjs" || true
  else
    warn "Vitals extension not installed; nothing to patch"
  fi
fi

# ============================================================================
# 8. optional: Ptyxis terminal palette (--terminal)
# ============================================================================
if [ "$DO_TERMINAL" = 1 ]; then
  log "installing Ptyxis palette '$LABEL'"
  PD="$HOME/.local/share/org.gnome.Ptyxis/palettes"; mkdir -p "$PD"
  cp "$BUILD/ptyxis/$LABEL.palette" "$PD/"
  if gsettings list-schemas 2>/dev/null | grep -q org.gnome.Ptyxis; then
    # gsettings serializes strings in SINGLE quotes; strip both quote kinds
    uuid="$(gsettings get org.gnome.Ptyxis default-profile-uuid 2>/dev/null | tr -d "\"'")"
    [ -n "$uuid" ] && dconf write "/org/gnome/Ptyxis/Profiles/$uuid/palette" "'$LABEL'"
  else
    warn "Ptyxis not detected. Palette copied; select '$LABEL' in Ptyxis > Preferences"
  fi
fi

# ============================================================================
# 9. optional: GDM login screen (--gdm)  [root; reversible; handled by helper]
# ============================================================================
if [ "$DO_GDM" = 1 ]; then
  FRAG="$BUILD/gdm/gnome-shell-gdm.css"
  if [ ! -f "$FRAG" ]; then
    warn "GDM css fragment missing ($FRAG); skipping GDM"
  elif ! command -v gdm >/dev/null && [ ! -d /etc/gdm3 ] && [ ! -d /etc/gdm ]; then
    warn "GDM does not appear to be the display manager; skipping GDM theming"
  else
    # the rebuild needs glib-compile-resources; its package name varies by distro
    if ! command -v glib-compile-resources >/dev/null; then
      log "installing glib-compile-resources (for the GDM gresource rebuild)"
      if [ "$PM" = dnf ]; then
        pm_install_any glib2-devel || true
      else
        pm_install_any libgio-2.0-dev-bin libglib2.0-dev-bin libglib2.0-dev || true
      fi
    fi
    if ! command -v glib-compile-resources >/dev/null || ! command -v gresource >/dev/null; then
      warn "gresource/glib-compile-resources unavailable; skipping GDM theming"
    elif [ -z "$SUDO" ] && [ "$(id -u)" -ne 0 ]; then
      warn "GDM theming needs root and sudo is unavailable; skipping"
    else
      log "theming the GDM login screen (sudo may prompt; fully reversible)"
      # the helper builds + validates in a tempdir and only swaps the live
      # gresource if valid; it never restarts GDM or touches the dconf profile.
      $SUDO bash "$REPO/lib/gdm-theme-setup.sh" install "$THEME" "$FRAG" \
        || warn "GDM theming failed; the login screen was left unchanged"
    fi
  fi
fi

# ============================================================================
# 10. optional: Firefox browser chrome (--firefox)
#     Installs userChrome.css + userContent.css + a marked user.js block into
#     every Firefox profile found (native, snap, flatpak). Restart Firefox to
#     apply. An existing non-shadcn userChrome.css is backed up once.
# ============================================================================
if [ "$DO_FIREFOX" = 1 ]; then
  FF="$BUILD/firefox"
  if [ ! -f "$FF/userChrome.css" ]; then
    warn "Firefox css missing ($FF); skipping Firefox"
  else
    FF_BEGIN="// >>> shadcn-gnome firefox prefs"
    FF_END="// <<< shadcn-gnome firefox prefs"
    ff_count=0
    for root in "$HOME/.mozilla/firefox" \
                "$HOME/snap/firefox/common/.mozilla/firefox" \
                "$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox"; do
      [ -d "$root" ] || continue
      for prof in "$root"/*/; do
        [ -f "$prof/prefs.js" ] || [ -f "$prof/times.json" ] || continue   # a real profile
        mkdir -p "$prof/chrome"
        # keep a one-time backup of a userChrome.css we did not write
        if [ -f "$prof/chrome/userChrome.css" ] && ! grep -q 'shadcn-gnome' "$prof/chrome/userChrome.css" \
           && [ ! -f "$prof/chrome/userChrome.css.shadcn-bak" ]; then
          cp "$prof/chrome/userChrome.css" "$prof/chrome/userChrome.css.shadcn-bak"
        fi
        cp "$FF/userChrome.css"   "$prof/chrome/userChrome.css"
        cp "$FF/userContent.css"  "$prof/chrome/userContent.css"
        # refresh our marked prefs block in user.js (idempotent). awk, not sed:
        # the markers contain '/', which would break a sed /addr/,/addr/ range.
        uj="$prof/user.js"; tmp="$(mktemp)"
        [ -f "$uj" ] && awk -v b="$FF_BEGIN" -v e="$FF_END" '$0==b{skip=1} skip==0{print} $0==e{skip=0}' "$uj" > "$tmp" || true
        { cat "$tmp"; echo "$FF_BEGIN"; cat "$FF/user.js"; echo "$FF_END"; } > "$uj"
        rm -f "$tmp"
        ff_count=$((ff_count + 1))
      done
    done
    if [ "$ff_count" -gt 0 ]; then
      log "themed $ff_count Firefox profile(s); restart Firefox to apply"
    else
      warn "no Firefox profile found; run Firefox once, then re-run with --firefox"
    fi
  fi
fi

echo
log "done: theme '$LABEL' installed."
log "GTK apps + terminal apply on restart; the Shell + icon theme apply live,"
log "but log out/in for a fully consistent result."
[ "$DO_GDM" = 1 ] && log "GDM: the login screen changes on the next lock/login (no restart needed)."
