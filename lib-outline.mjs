// lib-outline.mjs — convert a stroke-based line SVG (Lucide / Tabler) into a
// FILL-only SVG so GTK's symbolic recoloring (which forces fill on every
// shape) renders clean lines instead of solid blobs. Strokes become dense
// overlapping filled dots (round caps/joins for free); already-filled elements
// are kept as fills. Also composes a folder + a small glyph (folder emblems).
import { svgPathProperties } from 'svg-path-properties';

const num = (s) => parseFloat(s);
const attrs = (tag) => {
  const o = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
};

function toPath(name, a) {
  switch (name) {
    case 'path':
      return a.d || '';
    case 'line':
      return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`;
    case 'polyline':
      return 'M' + a.points.trim().replace(/\s+/g, ' ');
    case 'polygon':
      return 'M' + a.points.trim().replace(/\s+/g, ' ') + 'Z';
    case 'circle': {
      const cx = num(a.cx),
        cy = num(a.cy),
        r = num(a.r);
      return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    }
    case 'ellipse': {
      const cx = num(a.cx),
        cy = num(a.cy),
        rx = num(a.rx),
        ry = num(a.ry);
      return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
    }
    case 'rect': {
      const x = num(a.x),
        y = num(a.y),
        w = num(a.width),
        h = num(a.height);
      let rx = a.rx != null ? num(a.rx) : a.ry != null ? num(a.ry) : 0;
      let ry = a.ry != null ? num(a.ry) : rx;
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (!rx && !ry) return `M${x} ${y}h${w}v${h}h${-w}Z`;
      return (
        `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}` +
        `v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}` +
        `a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}Z`
      );
    }
    default:
      return '';
  }
}

const r2 = (n) => Math.round(n * 100) / 100;

// Sample every drawable element into filled dots (stroked) / kept paths (filled),
// in the source 24-unit coordinate space.
export function sample(svgText, strokeWidth = 1.25) {
  const rw = strokeWidth / 2;
  const step = Math.max(0.4, rw * 0.7);
  const dots = [];
  const fills = [];
  const elRe =
    /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)\/?>/g;
  let m;
  while ((m = elRe.exec(svgText))) {
    const name = m[1];
    const a = attrs(m[0]);
    const filled = a.fill && a.fill !== 'none';
    if (a.stroke === 'none' && !filled) continue; // invisible spacer (Tabler)
    const d = toPath(name, a);
    if (!d) continue;
    if (filled) {
      fills.push(d);
      continue;
    }
    let props;
    try {
      props = new svgPathProperties(d);
    } catch {
      continue;
    }
    const len = props.getTotalLength();
    if (!(len > 0)) {
      const p = props.getPointAtLength(0);
      dots.push([r2(p.x), r2(p.y)]);
      continue;
    }
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i <= n; i++) {
      const p = props.getPointAtLength((i / n) * len);
      dots.push([r2(p.x), r2(p.y)]);
    }
  }
  return { dots, fills, rw };
}

export function emit(dots, fills, { size = 16, pad = 0, rw = 0.75 } = {}) {
  const body =
    fills.map((d) => `<path d="${d}"/>`).join('') +
    dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${rw}"/>`).join('');
  const vb = `${-pad} ${-pad} ${24 + 2 * pad} ${24 + 2 * pad}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="${vb}" fill="currentColor" stroke="none">${body}</svg>`
  );
}

export function outline(
  svgText,
  { size = 16, strokeWidth = 1.25, pad = 3 } = {},
) {
  const { dots, fills, rw } = sample(svgText, strokeWidth);
  return emit(dots, fills, { size, pad, rw });
}

// Folder + glyph emblem: sample the folder, sample the glyph, shrink+shift the
// glyph into the folder body, merge. The glyph's stroke SCALES with the glyph
// (grw = folder rw * glyphScale) so the emblem reads like a normal 1.25-stroke
// Lucide icon at small size — not a chunky, disproportionately bold mark.
export function composeFolder(
  folderSvg,
  glyphSvg,
  {
    size = 16,
    strokeWidth = 1.25,
    pad = 3,
    glyphScale = 0.42,
    gx = 12,
    gy = 13.6,
  } = {},
) {
  const f = sample(folderSvg, strokeWidth);
  const g = sample(glyphSvg, strokeWidth);
  const grw = r2(f.rw * glyphScale);
  const circles =
    f.dots
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${f.rw}"/>`)
      .join('') +
    g.dots
      .map(
        ([x, y]) =>
          `<circle cx="${r2(gx + glyphScale * (x - 12))}" cy="${r2(gy + glyphScale * (y - 12))}" r="${grw}"/>`,
      )
      .join('');
  const fills = f.fills.map((d) => `<path d="${d}"/>`).join('');
  const vb = `${-pad} ${-pad} ${24 + 2 * pad} ${24 + 2 * pad}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="${vb}" fill="currentColor" stroke="none">${fills}${circles}</svg>`
  );
}
