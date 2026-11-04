const round = (value) => Math.round(value * 100) / 100;

export function radiusScale(base) {
  return Object.freeze({
    sm: round(base * 0.67),
    md: base,
    lg: round(base * 1.34),
    xl: round(base * 2),
    xxl: round(base * 2.67),
    tile: round(base * 1.67),
    switcherTile: round(base * 2.2),
    full: 999,
  });
}

export const motion = Object.freeze({
  popover: 150,
  toggle: 200,
  page: 250,
  overview: 350,
  reduced: 150,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
});

export function fontFamily(fontSpec) {
  return fontSpec.replace(/\s+\d+(\.\d+)?$/, '');
}

export function designTokens(theme) {
  return Object.freeze({
    radius: radiusScale(theme.radius),
    motion,
    strokeJoin: theme.strokeJoin,
    fonts: {
      interface: fontFamily(theme.fonts.interface),
      monospace: fontFamily(theme.fonts.monospace),
    },
  });
}
