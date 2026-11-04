const HEX = /^#([0-9a-f]{6})$/i;

export function isHex(value) {
  return typeof value === 'string' && HEX.test(value);
}

export function parseHex(hex) {
  if (!isHex(hex)) throw new TypeError(`expected #rrggbb, got "${hex}"`);
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHex({ r, g, b }) {
  const channel = (v) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function withAlpha(hex, alpha) {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function mix(from, to, amount) {
  const a = parseHex(from);
  const b = parseHex(to);
  const lerp = (x, y) => x + (y - x) * amount;
  return toHex({ r: lerp(a.r, b.r), g: lerp(a.g, b.g), b: lerp(a.b, b.b) });
}

export function relativeLuminance(hex) {
  const linear = (channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(foreground, background) {
  const [hi, lo] = [relativeLuminance(foreground), relativeLuminance(background)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isLight(hex) {
  return relativeLuminance(hex) > 0.4;
}
