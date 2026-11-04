import { SCHEMES } from '../theme/catalog.mjs';
import { resolveTerminalPalette } from '../theme/palette.mjs';

const ANSI_ORDER = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brBlack',
  'brRed',
  'brGreen',
  'brYellow',
  'brBlue',
  'brMagenta',
  'brCyan',
  'brWhite',
];

export const terminalTarget = {
  id: 'terminal',
  description: 'Ptyxis palette with Dark and Light sections',
  build(context) {
    const sections = SCHEMES.map((scheme) => paletteSection(scheme, resolveTerminalPalette(context.theme, scheme)));
    const file = `ptyxis/${context.theme.label}.palette`;
    context.output.write(file, `[Palette]\nName=${context.theme.label}\nPrimary=true\n\n${sections.join('\n')}`);
    return file;
  },
};

function paletteSection(scheme, palette) {
  const title = scheme[0].toUpperCase() + scheme.slice(1);
  const colors = ANSI_ORDER.map((slot, index) => `Color${index}=${palette[slot]}`);
  return [`[${title}]`, `Background=${palette.bg}`, `Foreground=${palette.fg}`, `Cursor=${palette.cursor}`, ...colors, ''].join('\n');
}
