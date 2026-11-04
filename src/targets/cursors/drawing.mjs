export const CURSOR_VARIANTS = Object.freeze({
  light: { themeName: 'Shadcn', fill: '#fafafa', outline: '#0a0a0a' },
  dark: { themeName: 'Shadcn-Dark', fill: '#0a0a0a', outline: '#fafafa' },
});

const GLYPH_OFFSET = 'translate(4 4)';
const SHRUNK_POINTER = 'translate(6 4) scale(.8) translate(-6 -4)';
const BADGE_CENTRE = [23.5, 23.5];
const GLYPH_CENTRE = [16, 16];

export function cursorSvg(cursor, { paths, colors, join, grid, angle = 0 }) {
  const resolve = (value) => paths[value] ?? value;
  const layers = [];

  if (cursor.fill) {
    const transform = [cursor.small ? SHRUNK_POINTER : '', cursor.rotate ? `rotate(${cursor.rotate} 16 16)` : ''].join(' ').trim();
    layers.push(filledShape(resolve(cursor.fill), colors, join, transform));
  }
  if (cursor.detail) {
    layers.push(`<path d="${resolve(cursor.detail)}" fill="none" stroke="${colors.outline}" stroke-width="1.1" stroke-linecap="round"/>`);
  }
  if (cursor.line) {
    const spin = cursor.spin && !cursor.badge ? rotation(angle, GLYPH_CENTRE) : '';
    layers.push(`<g transform="${spin} ${GLYPH_OFFSET}">${haloedLine(resolve(cursor.line), colors, join)}</g>`);
  }
  if (cursor.badge) {
    const spin = cursor.spin ? rotation(angle, BADGE_CENTRE) : '';
    layers.push(
      `<circle cx="${BADGE_CENTRE[0]}" cy="${BADGE_CENTRE[1]}" r="7" fill="${colors.fill}" stroke="${colors.outline}" stroke-width="2" paint-order="stroke"/>`,
      `<g transform="${spin} translate(17.5 17.5) scale(.5)"><path d="${resolve(cursor.badge)}" fill="none" stroke="${colors.outline}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${grid}" height="${grid}" viewBox="0 0 ${grid} ${grid}">${layers.join('')}</svg>`;
}

function filledShape(d, colors, join, transform) {
  const transformAttribute = transform ? ` transform="${transform}"` : '';
  return `<path d="${d}"${transformAttribute} fill="${colors.fill}" stroke="${colors.outline}" stroke-width="2" paint-order="stroke" stroke-linejoin="${join}"/>`;
}

function haloedLine(d, colors, join) {
  const common = `d="${d}" fill="none" stroke-linecap="round" stroke-linejoin="${join}"`;
  return `<path ${common} stroke="${colors.outline}" stroke-width="4.6"/><path ${common} stroke="${colors.fill}" stroke-width="2"/>`;
}

function rotation(angle, [x, y]) {
  return angle ? `rotate(${angle} ${x} ${y})` : '';
}

export function animationAngles(cursor, spinner) {
  if (!cursor.spin) return [0];
  return Array.from({ length: spinner.frames }, (_, frame) => (360 / spinner.frames) * frame);
}
