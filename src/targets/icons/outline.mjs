import { svgPathProperties } from 'svg-path-properties';

export const ICON_STROKE_WIDTH = 1.5;
const GRID = 24;

const roundTo2 = (n) => Math.round(n * 100) / 100;
const number = (value) => Number.parseFloat(value);

function attributesOf(tag) {
  const attributes = {};
  for (const [, name, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) attributes[name] = value;
  return attributes;
}

function elementToPath(name, a) {
  switch (name) {
    case 'path':
      return a.d || '';
    case 'line':
      return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`;
    case 'polyline':
      return `M${a.points.trim().replace(/\s+/g, ' ')}`;
    case 'polygon':
      return `M${a.points.trim().replace(/\s+/g, ' ')}Z`;
    case 'circle':
      return ellipsePath(number(a.cx), number(a.cy), number(a.r), number(a.r));
    case 'ellipse':
      return ellipsePath(number(a.cx), number(a.cy), number(a.rx), number(a.ry));
    case 'rect':
      return rectPath(a);
    default:
      return '';
  }
}

function ellipsePath(cx, cy, rx, ry) {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
}

function rectPath(a) {
  const [x, y, w, h] = [number(a.x || 0), number(a.y || 0), number(a.width), number(a.height)];
  let rx = a.rx != null ? number(a.rx) : a.ry != null ? number(a.ry) : 0;
  let ry = a.ry != null ? number(a.ry) : rx;
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  if (!rx && !ry) return `M${x} ${y}h${w}v${h}h${-w}Z`;
  return (
    `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}` +
    `v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}` +
    `a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}Z`
  );
}

// GTK recolors symbolic icons by forcing `fill`, so every stroke is resampled
// into overlapping filled dots along its centre line (round caps and joins).
export function sampleStrokes(svgText, strokeWidth = ICON_STROKE_WIDTH) {
  const radius = strokeWidth / 2;
  const step = Math.max(0.4, radius * 0.7);
  const dots = [];
  const fills = [];
  for (const match of svgText.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)\/?>/g)) {
    const attributes = attributesOf(match[0]);
    const filled = attributes.fill && attributes.fill !== 'none';
    if (attributes.stroke === 'none' && !filled) continue;
    const d = elementToPath(match[1], attributes);
    if (!d) continue;
    if (filled) {
      fills.push(d);
      continue;
    }
    dots.push(...dotsAlong(d, step));
  }
  return { dots, fills, radius };
}

function dotsAlong(d, step) {
  let properties;
  try {
    properties = new svgPathProperties(d);
  } catch {
    return [];
  }
  const length = properties.getTotalLength();
  if (!(length > 0)) {
    const { x, y } = properties.getPointAtLength(0);
    return [[roundTo2(x), roundTo2(y)]];
  }
  const count = Math.max(1, Math.ceil(length / step));
  return Array.from({ length: count + 1 }, (_, i) => {
    const { x, y } = properties.getPointAtLength((i / count) * length);
    return [roundTo2(x), roundTo2(y)];
  });
}

function viewBox(pad) {
  return `${-pad} ${-pad} ${GRID + 2 * pad} ${GRID + 2 * pad}`;
}

function fillOnlySvg(body, { size, pad }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox(pad)}" fill="currentColor" stroke="none">${body}</svg>`;
}

const circles = (dots, radius) => dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${radius}"/>`).join('');
const paths = (ds) => ds.map((d) => `<path d="${d}"/>`).join('');

export function toSymbolic(svgText, { size = 16, strokeWidth = ICON_STROKE_WIDTH, pad = 3 } = {}) {
  const { dots, fills, radius } = sampleStrokes(svgText, strokeWidth);
  return fillOnlySvg(paths(fills) + circles(dots, radius), { size, pad });
}

// A folder with a small glyph emblem; the emblem stroke scales with the glyph.
export function composeFolder(folderSvg, glyphSvg, { size = 16, strokeWidth = ICON_STROKE_WIDTH, pad = 3, scale = 0.42, centre = [12, 13.6] } = {}) {
  const folder = sampleStrokes(folderSvg, strokeWidth);
  const glyph = sampleStrokes(glyphSvg, strokeWidth);
  const [gx, gy] = centre;
  const placed = glyph.dots.map(([x, y]) => [roundTo2(gx + scale * (x - 12)), roundTo2(gy + scale * (y - 12))]);
  const body = paths(folder.fills) + circles(folder.dots, folder.radius) + circles(placed, roundTo2(folder.radius * scale));
  return fillOnlySvg(body, { size, pad });
}

export function bakeStroke(svgText, color, { strokeWidth = ICON_STROKE_WIDTH, pad = 3 } = {}) {
  return svgText
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\swidth="24"/, ' width="16"')
    .replace(/\sheight="24"/, ' height="16"')
    .replace(/viewBox="0 0 24 24"/, `viewBox="${viewBox(pad)}"`)
    .replaceAll('stroke-width="2"', `stroke-width="${strokeWidth}"`)
    .replaceAll('stroke="currentColor"', `stroke="${color}"`)
    .replaceAll('fill="currentColor"', `fill="${color}"`);
}

export function bakeFill(symbolicSvg, color) {
  return symbolicSvg.replace('fill="currentColor"', `fill="${color}"`);
}
