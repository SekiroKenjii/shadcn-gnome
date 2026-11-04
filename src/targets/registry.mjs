import { cursorsTarget } from './cursors.mjs';
import { firefoxTarget } from './firefox.mjs';
import { gdmTarget } from './gdm.mjs';
import { gtkTarget } from './gtk.mjs';
import { iconsTarget } from './icons.mjs';
import { shellTarget } from './shell.mjs';
import { terminalTarget } from './terminal.mjs';
import { wallpapersTarget } from './wallpapers.mjs';

export const TARGETS = Object.freeze(
  Object.fromEntries(
    [gtkTarget, shellTarget, gdmTarget, terminalTarget, firefoxTarget, wallpapersTarget, iconsTarget, cursorsTarget].map((target) => [target.id, target]),
  ),
);

export function selectTargets(ids) {
  if (!ids?.length) return Object.values(TARGETS);
  return ids.map((id) => {
    const target = TARGETS[id];
    if (!target) throw new Error(`unknown target "${id}" (available: ${Object.keys(TARGETS).join(', ')})`);
    return target;
  });
}
