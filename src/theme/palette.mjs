import { isLight, withAlpha } from '../core/color.mjs';
import { readJson } from '../core/json.mjs';
import { paths } from '../core/paths.mjs';

const SCHEME_EFFECTS = Object.freeze({
  dark: {
    shade: 'rgba(0,0,0,0.36)',
    scrim: 'rgba(0,0,0,0.35)',
    selectionScrim: 'rgba(0,0,0,0.55)',
    wallpaperLine: 'rgba(255,255,255,0.06)',
    wallpaperSpot: 'rgba(255,255,255,0.12)',
  },
  light: {
    shade: 'rgba(0,0,0,0.14)',
    scrim: 'rgba(0,0,0,0.25)',
    selectionScrim: 'rgba(0,0,0,0.45)',
    wallpaperLine: 'rgba(0,0,0,0.07)',
    wallpaperSpot: 'rgba(0,0,0,0.05)',
  },
});

export function resolvePalette(theme, scheme, { darkPanel = false } = {}) {
  const block = theme.schemes[scheme];
  const c = block.colors;
  const panel = {
    panel: scheme === 'dark' ? c.bg : c.card,
    panelFg: c.fg,
    panelBorder: c.border,
    panelHover: c.hover,
    panelActive: c.secondary,
    ...(darkPanel && scheme === 'light' ? block.darkPanel : {}),
  };

  return Object.freeze({
    ...c,
    cardFg: c.fg,
    popoverFg: c.fg,
    sidebarFg: c.fg,
    secondaryFg: c.fg,
    accentFg: c.fg,
    iconFg: c.fg,
    destructiveFg: '#ffffff',
    inverseBg: c.fg,
    inverseFg: c.bg,
    dividerOnPrimary: isLight(c.primary) ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.32)',
    focusHalo: withAlpha(c.ring, 0.35),
    ...SCHEME_EFFECTS[scheme],
    ...panel,
  });
}

export function resolveTerminalPalette(theme, scheme) {
  const ansi = readJson(paths.terminalAnsi)[scheme];
  return Object.freeze({ ...ansi, ...theme.schemes[scheme].terminal });
}
