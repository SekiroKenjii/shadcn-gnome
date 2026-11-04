import { compileStylesheet } from '../styles/compile.mjs';

export function compileForScheme(context, entry, scheme) {
  return compileStylesheet(entry, {
    scheme,
    palettes: context.palettes,
    tokens: context.tokens,
    options: { darkPanel: context.options.darkPanel },
  });
}

export function banner(context, surface) {
  return `/* shadcn-gnome · ${context.theme.label} · ${surface}. Generated from themes/${context.theme.id}.json; do not edit. */\n`;
}
