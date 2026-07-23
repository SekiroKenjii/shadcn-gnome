// lib-outline.mjs — convert a Lucide stroke SVG into a FILL-only SVG so GTK's
// symbolic recoloring (which forces fill on every shape) renders clean lines
// instead of solid blobs. Strokes become dense overlapping filled dots (round
// caps/joins for free); already-filled elements are kept as fills.
import {svgPathProperties} from 'svg-path-properties';

const num = s => parseFloat(s);
const attrs = tag => {
    const o = {};
    for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) o[m[1]] = m[2];
    return o;
};

// element -> path `d`
function toPath(name, a) {
    switch (name) {
    case 'path': return a.d || '';
    case 'line': return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`;
    case 'polyline': return 'M' + a.points.trim().replace(/\s+/g, ' ');
    case 'polygon': return 'M' + a.points.trim().replace(/\s+/g, ' ') + 'Z';
    case 'circle': {
        const cx = num(a.cx), cy = num(a.cy), r = num(a.r);
        return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    }
    case 'ellipse': {
        const cx = num(a.cx), cy = num(a.cy), rx = num(a.rx), ry = num(a.ry);
        return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
    }
    case 'rect': {
        const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height);
        let rx = a.rx != null ? num(a.rx) : (a.ry != null ? num(a.ry) : 0);
        let ry = a.ry != null ? num(a.ry) : rx;
        rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
        if (!rx && !ry) return `M${x} ${y}h${w}v${h}h${-w}Z`;
        return `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}`
            + `v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}`
            + `a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}Z`;
    }
    default: return '';
    }
}

const r2 = n => Math.round(n * 100) / 100;

export function outline(svgText, {size = 16, strokeWidth = 2} = {}) {
    const rw = strokeWidth / 2;                 // dot radius
    const step = Math.max(0.5, rw * 0.8);       // dot spacing (< 2*rw so they merge)
    const dots = [];
    const fills = [];

    const elRe = /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)\/?>/g;
    let m;
    while ((m = elRe.exec(svgText))) {
        const name = m[1];
        const a = attrs(m[0]);
        const d = toPath(name, a);
        if (!d) continue;
        const filled = a.fill && a.fill !== 'none';  // element paints a fill itself
        if (filled) { fills.push(d); continue; }
        // stroked -> sample into dots
        let props;
        try { props = new svgPathProperties(d); } catch { continue; }
        const len = props.getTotalLength();
        if (!(len > 0)) {
            // zero-length (a dot): single circle
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

    const body =
        fills.map(d => `<path d="${d}"/>`).join('') +
        dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${rw}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `
        + `viewBox="0 0 24 24" fill="currentColor" stroke="none">${body}</svg>`;
}
