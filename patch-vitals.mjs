// patch-vitals.mjs — replace the Vitals@CoreCoding.com extension's bundled
// metric icons with matching Lucide line icons so it matches the system theme.
// Vitals loads these as -symbolic gicons from its own icons/{original,gnome}/
// dirs (not the icon theme), so we overwrite the files directly (backing up
// the originals once). Usage: node patch-vitals.mjs [VITALS_EXT_DIR]
import {readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, cpSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {outline} from './lib-outline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LUCIDE = existsSync(`${HERE}/node_modules/lucide-static/icons`)
    ? `${HERE}/node_modules/lucide-static/icons`
    : `${HERE}/.work/node_modules/lucide-static/icons`;
const VITALS = process.argv[2] ||
    `${process.env.HOME}/.local/share/gnome-shell/extensions/Vitals@CoreCoding.com`;

// Vitals metric base-name -> Lucide icon
const MAP = {
    battery: 'battery', cpu: 'cpu', fan: 'fan', gpu: 'gpu',
    memory: 'memory-stick', network: 'arrow-up-down',
    'network-download': 'download', 'network-upload': 'upload',
    storage: 'hard-drive', system: 'gauge',
    temperature: 'thermometer', voltage: 'zap',
};

if (!existsSync(VITALS)) {
    console.log(`Vitals not installed at ${VITALS} — skipping`);
    process.exit(0);
}

// Vitals icons sit in the panel/menu (small UI slots) — full-size glyph,
// stroke 1.5, matching the system symbolic icons.
const lucideOutline = n => outline(readFileSync(`${LUCIDE}/${n}.svg`, 'utf8'), {pad: 0, strokeWidth: 1.5});

let patched = 0;
for (const set of ['original', 'gnome']) {
    const dir = `${VITALS}/icons/${set}`;
    if (!existsSync(dir)) continue;
    // back up the pristine set once
    const backup = `${VITALS}/icons/_backup-${set}`;
    if (!existsSync(backup)) cpSync(dir, backup, {recursive: true});
    for (const f of readdirSync(dir)) {
        if (!f.endsWith('-symbolic.svg')) continue;
        const base = f.slice(0, -('-symbolic.svg'.length));
        const lu = MAP[base];
        if (!lu) { console.warn(`  no mapping for ${set}/${base}`); continue; }
        writeFileSync(`${dir}/${f}`, lucideOutline(lu));
        patched++;
    }
}
console.log(`patched ${patched} Vitals icons (backups in icons/_backup-*).`);
