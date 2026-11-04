import { existsSync, readFileSync } from 'node:fs';
import { paths } from '../core/paths.mjs';
import { ICON_CONTEXTS, loadIconOverrides, lucideInventory, resolveMapping, systemAppMatcher } from './icons/mapping.mjs';
import { bakeFill, bakeStroke, toSymbolic } from './icons/outline.mjs';
import { appOverlays, folderOverlays } from './icons/overlays.mjs';

export const ICON_THEMES = Object.freeze({ dark: 'Lucide', light: 'Lucide-Light' });

export const iconsTarget = {
  id: 'icons',
  description: 'Lucide freedesktop icon theme (symbolic + plain) and a light-scheme companion',
  build(context) {
    if (!existsSync(paths.lucideIcons)) throw new Error('lucide-static is missing; run `npm ci` first');
    const overrides = loadIconOverrides();
    const mapping = resolveMapping({ overrides, inventory: lucideInventory() });
    const icons = collectIcons(mapping, overrides);

    const base = new IconThemeWriter(context.output.subdirectory(`icons/${ICON_THEMES.dark}`));
    const light = new IconThemeWriter(context.output.subdirectory(`icons/${ICON_THEMES.light}`));
    base.reset();
    light.reset();

    for (const icon of icons) {
      base.add(icon.context, `${icon.name}-symbolic`, icon.symbolic);
      base.add(icon.context, icon.name, icon.plain(context.palettes.dark.iconFg));
      light.add(icon.context, icon.name, icon.plain(context.palettes.light.iconFg));
    }

    base.writeIndex({ name: ICON_THEMES.dark, comment: `Lucide line icons for ${context.theme.label}`, inherits: 'Adwaita,hicolor' });
    light.writeIndex({
      name: ICON_THEMES.light,
      comment: `Lucide plain icons for the light scheme of ${context.theme.label}`,
      inherits: `${ICON_THEMES.dark},Adwaita,hicolor`,
    });
    return `icons/${ICON_THEMES.dark} (${base.count} files), icons/${ICON_THEMES.light} (${light.count} files)`;
  },
};

function collectIcons(mapping, overrides) {
  const isSystemApp = systemAppMatcher(overrides);
  const sources = new Map();
  const readLucide = (icon) => sources.get(icon) ?? sources.set(icon, readFileSync(`${paths.lucideIcons}/${icon}.svg`, 'utf8')).get(icon);
  const symbolicCache = new Map();
  const symbolicOf = (icon) => symbolicCache.get(icon) ?? symbolicCache.set(icon, toSymbolic(readLucide(icon), { pad: -1 })).get(icon);

  const byKey = new Map();
  const put = (icon) => byKey.set(`${icon.context}/${icon.name}`, icon);

  for (const [context, names] of Object.entries(mapping)) {
    for (const [name, lucide] of Object.entries(names)) {
      if (context === 'apps' && !isSystemApp(name)) continue;
      if (!existsSync(`${paths.lucideIcons}/${lucide}.svg`)) continue;
      put({ context, name, symbolic: symbolicOf(lucide), plain: (color) => bakeStroke(readLucide(lucide), color) });
    }
  }
  if (existsSync(paths.tablerIcons)) {
    for (const app of appOverlays(overrides)) {
      put({ context: 'apps', name: app.name, symbolic: app.symbolic, plain: (color) => bakeFill(app.plain, color) });
    }
  }
  for (const folder of folderOverlays(overrides)) {
    put({ context: 'places', name: folder.name, symbolic: folder.symbolic, plain: (color) => bakeFill(folder.symbolic, color) });
  }
  return [...byKey.values()];
}

class IconThemeWriter {
  #output;
  #contexts = new Set();
  count = 0;

  constructor(output) {
    this.#output = output;
  }

  reset() {
    this.#output.clear();
  }

  add(context, name, svg) {
    this.#output.write(`scalable/${context}/${name}.svg`, svg);
    this.#contexts.add(context);
    this.count += 1;
  }

  writeIndex({ name, comment, inherits }) {
    const directories = [...this.#contexts].sort().map((context) => `scalable/${context}`);
    const sections = directories.map(
      (directory) => `[${directory}]\nContext=${ICON_CONTEXTS[directory.split('/')[1]]}\nSize=16\nMinSize=8\nMaxSize=512\nType=Scalable`,
    );
    this.#output.write(
      'index.theme',
      `[Icon Theme]\nName=${name}\nComment=${comment}\nInherits=${inherits}\nExample=folder\nDirectories=${directories.join(',')}\n\n${sections.join('\n\n')}\n`,
    );
  }
}
