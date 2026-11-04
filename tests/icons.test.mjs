import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { paths } from '../src/core/paths.mjs';
import { loadIconOverrides, lucideInventory, resolveMapping } from '../src/targets/icons/mapping.mjs';
import { bakeStroke, composeFolder, toSymbolic } from '../src/targets/icons/outline.mjs';

const inventory = lucideInventory();
const overrides = loadIconOverrides();
const mapping = resolveMapping({ overrides, inventory });
const lucide = (name) => readFileSync(`${paths.lucideIcons}/${name}.svg`, 'utf8');

test('symbolic icons are fill-only so GTK can recolor them', () => {
  const svg = toSymbolic(lucide('folder'));
  assert.match(svg, /fill="currentColor" stroke="none"/);
  assert.doesNotMatch(svg, /stroke-width/);
});

test('plain icons bake the scheme foreground at the 1.5 design stroke', () => {
  const svg = bakeStroke(lucide('folder'), '#333333');
  assert.match(svg, /stroke="#333333"/);
  assert.match(svg, /stroke-width="1.5"/);
});

test('folder emblems compose into a single fill-only icon', () => {
  assert.match(composeFolder(lucide('folder'), lucide('music')), /^<svg [^>]+fill="currentColor"/);
});

test('every mapped icon exists in the vendored Lucide set', () => {
  for (const [context, names] of Object.entries(mapping)) {
    for (const [name, icon] of Object.entries(names)) assert.ok(inventory.has(icon), `${context}/${name} -> ${icon}`);
  }
});

test('design remaps for GNOME 51 are applied', () => {
  assert.equal(mapping.emblems['emblem-readonly'], 'pencil-off');
  assert.equal(mapping.emblems['emblem-unreadable'], 'lock');
  assert.equal(mapping.status['dark-mode'], 'contrast');
  assert.equal(mapping.apps['org.gnome.Papers'], 'book-open-text');
  assert.equal(mapping.apps['org.gnome.Showtime'], 'clapperboard');
  assert.deepEqual(overrides.folderIcons['folder-projects'], { variant: 'folder-code' });
});
