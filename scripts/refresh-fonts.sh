#!/usr/bin/env bash
# Maintainer helper: refresh the vendored Geist variable fonts in assets/fonts.
set -euo pipefail
FONTS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../assets/fonts" && pwd -P)"
readonly SOURCE=https://github.com/google/fonts/raw/main/ofl

fetch() {
  curl -fSL --retry 3 -o "$FONTS/$1" "$SOURCE/$2"
}

fetch 'Geist[wght].ttf' 'geist/Geist%5Bwght%5D.ttf'
fetch 'GeistMono[wght].ttf' 'geistmono/GeistMono%5Bwght%5D.ttf'
file "$FONTS"/*.ttf
