import { existsSync, readFileSync } from 'node:fs';
import { paths } from '../../core/paths.mjs';
import { composeFolder, toSymbolic } from './outline.mjs';

export function* appOverlays(overrides) {
  const sources = [
    [overrides.appBrands, (icon) => `${paths.tablerIcons}/${icon}.svg`],
    [overrides.customApps, (icon) => `${paths.customIcons}/${icon}.svg`],
    [overrides.appTabler, (icon) => `${paths.tablerIcons}/${icon}.svg`],
  ];
  for (const [table, locate] of sources) {
    for (const [name, icon] of Object.entries(table ?? {})) {
      const file = locate(icon);
      if (!existsSync(file)) continue;
      const source = readFileSync(file, 'utf8');
      yield { name, symbolic: toSymbolic(source, { pad: 0 }), plain: toSymbolic(source, { pad: 3 }) };
    }
  }
}

export function* folderOverlays(overrides) {
  const lucide = (icon) => `${paths.lucideIcons}/${icon}.svg`;
  const folder = readFileSync(lucide('folder'), 'utf8');
  for (const [name, spec] of Object.entries(overrides.folderIcons ?? {})) {
    const icon = spec.variant ?? spec.glyph;
    if (!existsSync(lucide(icon))) continue;
    const source = readFileSync(lucide(icon), 'utf8');
    const symbolic = spec.variant ? toSymbolic(source, { pad: 3 }) : composeFolder(folder, source, { pad: 3 });
    yield { name, symbolic };
  }
}
