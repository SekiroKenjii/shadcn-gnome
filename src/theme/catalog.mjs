import { existsSync, readdirSync } from 'node:fs';
import { isHex } from '../core/color.mjs';
import { readJson } from '../core/json.mjs';
import { paths } from '../core/paths.mjs';

export const SCHEMES = Object.freeze(['dark', 'light']);

const REQUIRED_COLORS = Object.freeze([
  'bg',
  'fg',
  'card',
  'popover',
  'headerbar',
  'sidebar',
  'secondarySidebar',
  'primary',
  'primaryFg',
  'accentText',
  'secondary',
  'hover',
  'activeSel',
  'accent',
  'muted',
  'mutedFg',
  'border',
  'input',
  'ring',
  'destructive',
  'destructiveTint',
  'success',
  'warning',
]);
const REQUIRED_TERMINAL = Object.freeze(['bg', 'fg', 'cursor', 'black', 'brBlack']);
const WALLPAPERS = Object.freeze(['dots', 'grid', 'spotlight']);

export class ThemeValidationError extends Error {
  constructor(themeId, problems) {
    super(`theme "${themeId}" is invalid:\n  - ${problems.join('\n  - ')}`);
    this.problems = problems;
  }
}

export function listThemeIds() {
  if (!existsSync(paths.themes)) return [];
  return readdirSync(paths.themes)
    .filter((file) => file.endsWith('.json') && file !== 'schema.json')
    .map((file) => file.slice(0, -'.json'.length))
    .sort();
}

export function loadTheme(themeId) {
  const file = `${paths.themes}/${themeId}.json`;
  if (!existsSync(file)) {
    const available = listThemeIds().join(', ') || 'none';
    throw new Error(`unknown theme "${themeId}" (available: ${available})`);
  }
  const theme = readJson(file);
  const problems = validateTheme(theme, themeId);
  if (problems.length) throw new ThemeValidationError(themeId, problems);
  return Object.freeze({ strokeJoin: 'round', ...theme });
}

export function validateTheme(theme, expectedId = theme.id) {
  const problems = [];
  if (theme.id !== expectedId) problems.push(`id "${theme.id}" must match file name "${expectedId}"`);
  if (typeof theme.label !== 'string') problems.push('label is required');
  if (!(theme.radius >= 0)) problems.push('radius must be a non-negative number');
  if (!WALLPAPERS.includes(theme.wallpaper)) problems.push(`wallpaper must be one of ${WALLPAPERS.join(', ')}`);
  if (!theme.fonts?.interface || !theme.fonts?.monospace) problems.push('fonts.interface and fonts.monospace are required');

  for (const scheme of SCHEMES) {
    const block = theme.schemes?.[scheme];
    if (!block) {
      problems.push(`schemes.${scheme} is missing`);
      continue;
    }
    problems.push(...missingOrInvalid(block.colors, REQUIRED_COLORS, `schemes.${scheme}.colors`));
    problems.push(...missingOrInvalid(block.terminal, REQUIRED_TERMINAL, `schemes.${scheme}.terminal`));
    if (block.darkPanel) problems.push(...missingOrInvalid(block.darkPanel, [], `schemes.${scheme}.darkPanel`));
  }
  return problems;
}

function missingOrInvalid(group, requiredKeys, where) {
  if (!group) return [`${where} is missing`];
  const missing = requiredKeys.filter((key) => !(key in group)).map((key) => `${where}.${key} is missing`);
  const invalid = Object.entries(group)
    .filter(([, value]) => !isHex(value))
    .map(([key, value]) => `${where}.${key} must be #rrggbb (got "${value}")`);
  return [...missing, ...invalid];
}
