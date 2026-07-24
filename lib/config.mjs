// config.mjs: the single place that defines repo paths and loads themes/overrides.
// Every build script imports from here, so no path or resource is hardcoded and
// the repo relocates cleanly. Node ESM, no deps.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // .../lib
export const ROOT = resolve(HERE, '..'); // repo root

// --- static resource locations (edit these files, not the scripts) ---------
export const PATHS = {
  themes: `${ROOT}/themes`,
  assets: `${ROOT}/assets`,
  fonts: `${ROOT}/assets/fonts`,
  customIcons: `${ROOT}/assets/custom-icons`,
  mapping: `${ROOT}/assets/mapping.json`,
  iconOverrides: `${ROOT}/assets/icon-overrides.json`,
  build: `${ROOT}/build`,
};

// Lucide SVGs: prefer the repo's node_modules, fall back to the dev .work dir
// used by scripts/download-assets.sh.
export function lucideDir() {
  const a = `${ROOT}/node_modules/lucide-static/icons`;
  const b = `${ROOT}/.work/node_modules/lucide-static/icons`;
  if (existsSync(a)) return a;
  if (existsSync(b)) return b;
  throw new Error('lucide-static not found. Run `npm install` first');
}

export function tablerDir() {
  return `${ROOT}/node_modules/@tabler/icons/icons/outline`;
}

// Per-theme build output: build/<name>/{gtk-3.0,gtk-4.0,shell,ptyxis,Lucide}
export function themeBuildDir(name) {
  return `${PATHS.build}/${name}`;
}

// --- themes -----------------------------------------------------------------
export function availableThemes() {
  try {
    return readdirSync(PATHS.themes)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .sort();
  } catch {
    return [];
  }
}

export function loadTheme(name) {
  const file = `${PATHS.themes}/${name}.json`;
  if (!existsSync(file)) {
    const have = availableThemes().join(', ') || '(none)';
    throw new Error(`unknown theme "${name}" (available: ${have})`);
  }
  const t = JSON.parse(readFileSync(file, 'utf8'));
  t.name ??= name;
  return t;
}

// Theme requested via env (THEME=...) or first CLI arg, default "graphite".
export function resolveThemeName(fallback = 'graphite') {
  return process.env.THEME || process.argv[2] || fallback;
}

export function loadIconOverrides() {
  return JSON.parse(readFileSync(PATHS.iconOverrides, 'utf8'));
}
