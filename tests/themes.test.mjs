import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrastReport } from '../src/commands/contrast.mjs';
import { listThemeIds, loadTheme, SCHEMES, validateTheme } from '../src/theme/catalog.mjs';
import { resolvePalette, resolveTerminalPalette } from '../src/theme/palette.mjs';
import { radiusScale } from '../src/theme/tokens.mjs';

const themeIds = listThemeIds();

test('ships the three design themes', () => {
  assert.deepEqual(themeIds, ['graphite', 'mono', 'vercel']);
});

for (const id of themeIds) {
  test(`${id}: validates against the theme contract`, () => {
    assert.deepEqual(validateTheme(loadTheme(id), id), []);
  });

  for (const scheme of SCHEMES) {
    test(`${id}/${scheme}: every design contrast pair reaches AA`, () => {
      const failing = contrastReport(resolvePalette(loadTheme(id), scheme)).filter((check) => check.grade === 'fail');
      assert.deepEqual(failing, []);
    });

    test(`${id}/${scheme}: terminal palette fills all sixteen ANSI slots`, () => {
      const palette = resolveTerminalPalette(loadTheme(id), scheme);
      for (const slot of ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']) {
        assert.match(palette[slot], /^#[0-9a-f]{6}$/i, slot);
        assert.match(palette[`br${slot[0].toUpperCase()}${slot.slice(1)}`], /^#[0-9a-f]{6}$/i, `bright ${slot}`);
      }
    });
  }
}

test('reports every problem in a broken theme', () => {
  const broken = structuredClone(loadTheme('graphite'));
  broken.radius = -1;
  broken.schemes.light.colors.bg = 'white';
  delete broken.schemes.dark.colors.ring;
  const problems = validateTheme(broken, 'graphite');
  assert.equal(problems.length, 3);
});

test('graphite mutedFg was raised so captions pass on cards', () => {
  assert.equal(loadTheme('graphite').schemes.dark.colors.mutedFg, '#8c8c8c');
});

test('the top bar can stay dark in the light scheme', () => {
  const theme = loadTheme('vercel');
  assert.equal(resolvePalette(theme, 'light').panel, theme.schemes.light.colors.card);
  assert.equal(resolvePalette(theme, 'light', { darkPanel: true }).panel, '#000000');
  assert.equal(resolvePalette(theme, 'dark', { darkPanel: true }).panel, theme.schemes.dark.colors.bg);
});

test('the radius scale follows the design multipliers', () => {
  assert.deepEqual(radiusScale(6), { sm: 4.02, md: 6, lg: 8.04, xl: 12, xxl: 16.02, tile: 10.02, switcherTile: 13.2, full: 999 });
  assert.equal(radiusScale(0).xl, 0);
});
