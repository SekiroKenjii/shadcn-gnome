import * as sass from 'sass';
import { paths } from '../core/paths.mjs';

const TOKENS_URL = 'shadcn:tokens';

export function compileStylesheet(entry, tokenModule) {
  const contents = renderTokenModule(tokenModule);
  const result = sass.compile(`${paths.styles}/${entry}`, {
    style: 'expanded',
    loadPaths: [paths.styles],
    importers: [
      {
        canonicalize: (url) => (url === TOKENS_URL ? new URL(TOKENS_URL) : null),
        load: () => ({ contents, syntax: 'scss' }),
      },
    ],
  });
  return result.css;
}

export function renderTokenModule({ scheme, palettes, tokens, options = {} }) {
  const lines = [
    `$scheme: ${scheme};`,
    `$palette: ${scssMap(palettes[scheme])};`,
    `$palettes: (${Object.entries(palettes)
      .map(([name, palette]) => `"${name}": ${scssMap(palette)}`)
      .join(', ')});`,
    `$radius: ${scssMap(tokens.radius, 'px')};`,
    `$motion: ${scssMap(withoutEasing(tokens.motion), 'ms')};`,
    `$easing: ${tokens.motion.easing};`,
    `$font-interface: "${tokens.fonts.interface}";`,
    `$font-monospace: "${tokens.fonts.monospace}";`,
    `$stroke-join: ${tokens.strokeJoin};`,
    `$options: ${scssMap(options)};`,
  ];
  return `${lines.join('\n')}\n`;
}

function withoutEasing({ easing, ...durations }) {
  return durations;
}

function scssMap(record, unit = '') {
  const entries = Object.entries(record).map(([key, value]) => `"${kebabCase(key)}": ${scssValue(value, unit)}`);
  return `(${entries.join(', ')})`;
}

function scssValue(value, unit) {
  if (typeof value === 'number') return `${value}${unit}`;
  if (typeof value === 'boolean') return String(value);
  return value;
}

export function kebabCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
