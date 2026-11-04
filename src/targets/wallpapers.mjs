import { SCHEMES } from '../theme/catalog.mjs';

const WIDTH = 2560;
const HEIGHT = 1440;
export const BACKGROUNDS_PLACEHOLDER = '@BACKGROUNDS_DIR@';

const PATTERNS = Object.freeze({
  dots: (ink) => `<pattern id="p" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" ${ink}/></pattern>`,
  grid: (ink) => gridPattern(56, ink),
  spotlight: (ink) => gridPattern(64, ink),
});

export const wallpapersTarget = {
  id: 'wallpapers',
  description: 'SVG wallpapers (one pattern per theme, dark and light) and a GNOME background entry',
  build(context) {
    const { theme, palettes, output } = context;
    const files = Object.fromEntries(SCHEMES.map((scheme) => [scheme, wallpaperFileName(theme.wallpaper, scheme)]));
    for (const scheme of SCHEMES) {
      output.write(`backgrounds/${files[scheme]}`, wallpaperSvg(theme.wallpaper, palettes[scheme]));
    }
    output.write(`gnome-background-properties/shadcn-${theme.id}.xml`, backgroundProperties(theme, palettes, files));
    return `backgrounds/${files.dark}, backgrounds/${files.light}`;
  },
};

export function wallpaperFileName(pattern, scheme) {
  return `shadcn-${pattern}-${scheme}.svg`;
}

export function wallpaperSvg(pattern, palette) {
  const ink = paint(palette.wallpaperLine);
  const spotlight = pattern === 'spotlight' ? spotlightLayer(palette.wallpaperSpot) : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    `<defs>${PATTERNS[pattern](ink)}${spotlight.defs ?? ''}</defs>`,
    `<rect width="100%" height="100%" fill="${palette.bg}"/>`,
    spotlight.layer ?? '',
    '<rect width="100%" height="100%" fill="url(#p)"/>',
    '</svg>',
    '',
  ].join('\n');
}

function gridPattern(size, ink) {
  return `<pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="M0 0.5H${size}M0.5 0V${size}" fill="none" stroke-width="1" ${ink.replaceAll('fill', 'stroke')}/></pattern>`;
}

function spotlightLayer(spot) {
  const { color, opacity } = parseRgba(spot);
  const [cx, cy] = [WIDTH / 2, -0.08 * HEIGHT];
  const [rx, ry] = [0.7 * WIDTH, 0.55 * HEIGHT];
  const squash = `translate(${cx} ${cy}) scale(1 ${(ry / rx).toFixed(4)}) translate(${-cx} ${-cy})`;
  return {
    defs: `<radialGradient id="spot" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}" gradientTransform="${squash}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.7" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    layer: '<rect width="100%" height="100%" fill="url(#spot)"/>',
  };
}

function paint(rgba) {
  const { color, opacity } = parseRgba(rgba);
  return `fill="${color}" fill-opacity="${opacity}"`;
}

function parseRgba(value) {
  const [r, g, b, a] = value.match(/[\d.]+/g).map(Number);
  const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return { color: hex, opacity: a };
}

function backgroundProperties(theme, palettes, files) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE wallpapers SYSTEM "gnome-wp-list.dtd">
<wallpapers>
  <wallpaper deleted="false">
    <name>${theme.label}</name>
    <filename>${BACKGROUNDS_PLACEHOLDER}/${files.light}</filename>
    <filename-dark>${BACKGROUNDS_PLACEHOLDER}/${files.dark}</filename-dark>
    <options>zoom</options>
    <shade_type>solid</shade_type>
    <pcolor>${palettes.light.bg}</pcolor>
    <scolor>${palettes.dark.bg}</scolor>
  </wallpaper>
</wallpapers>
`;
}
