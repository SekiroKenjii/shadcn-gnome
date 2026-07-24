// overlay-icons.mjs: after the base Lucide theme is generated, overlay:
//   * app icons for popular apps, drawn from Tabler's brand-* set (same
//     outline style as Lucide) so each app keeps its identity in Lucide style;
//   * plain Tabler outline icons for utilitarian/plugin apps;
//   * hand-drawn Lucide-style marks (assets/custom-icons/) for brand-less apps;
//   * separate folder icons for XDG/special folders.
// The name->icon tables are NOT here. They come from assets/icon-overrides.json
// (passed in as `overrides`). Everything runs through the same stroke->fill
// pipeline so GTK recolors it cleanly.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { outline, composeFolder } from './lib-outline.mjs';
import { PATHS } from './config.mjs';

export function overlay({ OUT, LUCIDE_DIR, TABLER_DIR, FG, dirsUsed, overrides }) {
  const bakeFill = (s) => s.replace('fill="currentColor"', `fill="${FG}"`);
  const rdL = (n) => readFileSync(`${LUCIDE_DIR}/${n}.svg`, 'utf8');
  const appBrands = overrides.appBrands || {};
  const appTabler = overrides.appTabler || {};
  const customApps = overrides.customApps || {};
  const folderIcons = overrides.folderIcons || {};
  let apps = 0;
  let folders = 0;

  const AD = `${OUT}/scalable/apps`;
  const writeApp = (name, src) => {
    mkdirSync(AD, { recursive: true });
    writeFileSync(`${AD}/${name}-symbolic.svg`, outline(src, { pad: 0 })); // panel/dash
    writeFileSync(`${AD}/${name}.svg`, bakeFill(outline(src, { pad: 3 }))); // app grid
    apps++;
    dirsUsed.add('scalable/apps');
  };

  // brand marks (Tabler brand-*)
  for (const [name, brand] of Object.entries(appBrands)) {
    const p = `${TABLER_DIR}/${brand}.svg`;
    if (!existsSync(p)) continue;
    writeApp(name, readFileSync(p, 'utf8'));
  }

  // hand-drawn marks for brand-less apps (assets/custom-icons/)
  for (const [name, file] of Object.entries(customApps)) {
    const p = `${PATHS.customIcons}/${file}.svg`;
    if (!existsSync(p)) continue;
    writeApp(name, readFileSync(p, 'utf8'));
  }

  // plain Tabler outline icons for utilitarian/plugin apps (plug, dashboard...)
  for (const [name, tab] of Object.entries(appTabler)) {
    const p = `${TABLER_DIR}/${tab}.svg`;
    if (!existsSync(p)) continue;
    writeApp(name, readFileSync(p, 'utf8'));
  }

  const PD = `${OUT}/scalable/places`;
  const folderBase = rdL('folder');
  for (const [name, spec] of Object.entries(folderIcons)) {
    let sym;
    if (spec.variant) {
      if (!existsSync(`${LUCIDE_DIR}/${spec.variant}.svg`)) continue;
      sym = outline(rdL(spec.variant), { pad: 3 });
    } else {
      if (!existsSync(`${LUCIDE_DIR}/${spec.glyph}.svg`)) continue;
      sym = composeFolder(folderBase, rdL(spec.glyph), { pad: 3 });
    }
    mkdirSync(PD, { recursive: true });
    writeFileSync(`${PD}/${name}-symbolic.svg`, sym);
    writeFileSync(`${PD}/${name}.svg`, bakeFill(sym));
    folders++;
    dirsUsed.add('scalable/places');
  }
  return { apps, folders };
}
