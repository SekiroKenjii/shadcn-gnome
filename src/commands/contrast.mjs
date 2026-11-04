import { contrastRatio } from '../core/color.mjs';

const PAIRS = Object.freeze([
  ['Text on window', 'fg', 'bg'],
  ['Caption on card', 'mutedFg', 'card'],
  ['Primary button label', 'primaryFg', 'primary'],
  ['Text on selected row', 'fg', 'accent'],
  ['Panel text', 'panelFg', 'panel'],
]);

export function contrastReport(palette) {
  return PAIRS.map(([label, foreground, background]) => {
    const ratio = contrastRatio(palette[foreground], palette[background]);
    return { label, ratio, grade: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail' };
  });
}
