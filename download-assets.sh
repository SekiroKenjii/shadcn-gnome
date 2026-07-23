#!/usr/bin/env bash
# Fetch Geist fonts (variable TTF, Google Fonts) and lucide-static via npm.
set -uo pipefail
BUILD="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
FONTS="$BUILD/fonts"
WORK="$BUILD/.work"
mkdir -p "$FONTS" "$WORK"

echo ">>> Geist fonts"
geist_ok=1
curl -fSL --retry 3 -o "$FONTS/Geist[wght].ttf" \
  "https://github.com/google/fonts/raw/main/ofl/geist/Geist%5Bwght%5D.ttf" || geist_ok=0
curl -fSL --retry 3 -o "$FONTS/GeistMono[wght].ttf" \
  "https://github.com/google/fonts/raw/main/ofl/geistmono/GeistMono%5Bwght%5D.ttf" || geist_ok=0
if [ "$geist_ok" = 1 ]; then
  echo "geist files:"; file "$FONTS"/Geist*.ttf | sed 's/^/  /'
else
  echo "!!! Geist download failed"
fi

echo ">>> lucide-static"
cd "$WORK"
[ -f package.json ] || npm init -y >/dev/null 2>&1
if npm install lucide-static@1.25.0 >/dev/null 2>&1; then
  ICONS="$WORK/node_modules/lucide-static/icons"
  echo "lucide icons: $(ls "$ICONS"/*.svg 2>/dev/null | wc -l)"
  echo "sample:"; ls "$ICONS" | head -5 | sed 's/^/  /'
else
  echo "!!! lucide-static install failed"
fi
echo ">>> done"
