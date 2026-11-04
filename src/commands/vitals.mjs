import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { paths } from '../core/paths.mjs';
import { loadIconOverrides } from '../targets/icons/mapping.mjs';
import { toSymbolic } from '../targets/icons/outline.mjs';

const ICON_SETS = ['original', 'gnome'];
const SYMBOLIC_SUFFIX = '-symbolic.svg';

export const DEFAULT_VITALS_DIR = `${process.env.HOME}/.local/share/gnome-shell/extensions/Vitals@CoreCoding.com`;

export function patchVitals(extensionDir = DEFAULT_VITALS_DIR) {
  if (!existsSync(extensionDir)) return { patched: 0, missing: [], installed: false };
  const metricIcons = loadIconOverrides().vitals ?? {};
  const missing = [];
  let patched = 0;
  for (const set of ICON_SETS) {
    const directory = `${extensionDir}/icons/${set}`;
    if (!existsSync(directory)) continue;
    const backup = `${extensionDir}/icons/_backup-${set}`;
    if (!existsSync(backup)) cpSync(directory, backup, { recursive: true });
    for (const file of readdirSync(directory).filter((name) => name.endsWith(SYMBOLIC_SUFFIX))) {
      const metric = file.slice(0, -SYMBOLIC_SUFFIX.length);
      const lucide = metricIcons[metric];
      if (!lucide) {
        missing.push(`${set}/${metric}`);
        continue;
      }
      writeFileSync(`${directory}/${file}`, toSymbolic(readFileSync(`${paths.lucideIcons}/${lucide}.svg`, 'utf8'), { pad: 0 }));
      patched += 1;
    }
  }
  return { patched, missing, installed: true };
}

export function restoreVitals(extensionDir = DEFAULT_VITALS_DIR) {
  let restored = 0;
  for (const set of ICON_SETS) {
    const backup = `${extensionDir}/icons/_backup-${set}`;
    if (!existsSync(backup)) continue;
    cpSync(backup, `${extensionDir}/icons/${set}`, { recursive: true });
    rmSync(backup, { recursive: true, force: true });
    restored += 1;
  }
  return { restored };
}
