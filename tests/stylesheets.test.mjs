import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBuildContext } from '../src/build.mjs';
import { compileForScheme } from '../src/targets/stylesheets.mjs';
import { listThemeIds } from '../src/theme/catalog.mjs';

const ENTRIES = [
  ['gtk4/gtk.scss', 'dark'],
  ['gtk3/gtk.scss', 'dark'],
  ['gtk3/gtk.scss', 'light'],
  ['shell/gnome-shell.scss', 'dark'],
  ['shell/gnome-shell.scss', 'light'],
  ['gdm/greeter.scss', 'dark'],
  ['gdm/greeter.scss', 'light'],
];

for (const themeId of listThemeIds()) {
  const context = createBuildContext(themeId, { outputDir: '/nonexistent' });

  for (const [entry, scheme] of ENTRIES) {
    test(`${themeId}: ${entry} (${scheme}) compiles to plain CSS`, () => {
      const css = compileForScheme(context, entry, scheme);
      assert.ok(css.length > 1000);
      assert.doesNotMatch(css, /calc\(|\$[a-z]|#\{/, 'no unresolved Sass or calc() survives');
    });
  }

  test(`${themeId}: GTK4 declares every custom property it reads, for both schemes`, () => {
    const css = compileForScheme(context, 'gtk4/gtk.scss', 'dark');
    const used = new Set([...css.matchAll(/var\(--(shadcn-[a-z-]+)\)/g)].map((match) => match[1]));
    const [lightBlock, darkBlock] = css.split('@media (prefers-color-scheme: dark)');
    for (const property of used) {
      assert.match(lightBlock, new RegExp(`--${property}:`), `${property} in the light block`);
      assert.match(darkBlock, new RegExp(`--${property}:`), `${property} in the dark block`);
    }
  });

  test(`${themeId}: Shell overrides are scoped under #uiGroup`, () => {
    const css = compileForScheme(context, 'shell/gnome-shell.scss', 'dark');
    const selectors = [...css.matchAll(/^([^\s@}][^{]*)\{/gm)].map((match) => match[1].trim());
    const unscoped = selectors.filter((selector) => selector !== 'stage' && !selector.split(',').every((part) => part.trim().startsWith('#uiGroup')));
    assert.deepEqual(unscoped, []);
  });

  test(`${themeId}: light and dark Shell stylesheets differ only in color`, () => {
    const strip = (css) => css.replace(/#[0-9a-f]{3,8}\b|rgba\([^)]*\)/gi, 'COLOR');
    assert.equal(strip(compileForScheme(context, 'shell/gnome-shell.scss', 'dark')), strip(compileForScheme(context, 'shell/gnome-shell.scss', 'light')));
  });
}
