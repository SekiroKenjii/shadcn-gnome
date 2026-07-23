// enumerate-icons.mjs — collect every icon name the system requests, grouped
// by freedesktop context, plus the Lucide inventory. Emits build/icons/worklist.json.
import {readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, statSync} from 'node:fs';
import {dirname, join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME;
const LUCIDE = `${HERE}/.work/node_modules/lucide-static/icons`;

const THEMES = [`/usr/share/icons/Yaru`, `/usr/share/icons/Adwaita`];
const APP_DIRS = [
    `/usr/share/applications`,
    `${HOME}/.local/share/applications`,
    `/var/lib/flatpak/exports/share/applications`,
    `${HOME}/.local/share/flatpak/exports/share/applications`,
    `/var/lib/snapd/desktop/applications`,
];

// contexts we care about (freedesktop). "ui"/"legacy" fold into actions/status.
const CTX = ['actions', 'status', 'devices', 'places', 'mimetypes',
    'emblems', 'categories', 'apps'];
const foldCtx = c => ({ui: 'actions', legacy: 'actions', panel: 'status',
    'generic-symbols': 'status'}[c] || c);

function walk(dir, cb) {
    let ents;
    try { ents = readdirSync(dir, {withFileTypes: true}); } catch { return; }
    for (const e of ents) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, cb);
        else if (e.isSymbolicLink()) { try { if (statSync(p).isFile()) cb(p); } catch {} }
        else if (e.isFile()) cb(p);
    }
}

// context -> Set of base names (symbolic stripped)
const byCtx = {};
CTX.forEach(c => (byCtx[c] = new Set()));
const symbolicSet = new Set(); // names that exist as -symbolic somewhere

for (const theme of THEMES) {
    walk(theme, p => {
        if (!p.endsWith('.svg')) return;
        const parts = p.split('/');
        let ctx = foldCtx(parts[parts.length - 2]);
        if (!CTX.includes(ctx)) return;
        let name = basename(p, '.svg');
        if (name.endsWith('-symbolic')) { name = name.slice(0, -9); symbolicSet.add(name); }
        byCtx[ctx].add(name);
    });
}

// app icon names from .desktop Icon= entries (skip absolute paths & files)
const appIcons = new Set();
for (const d of APP_DIRS) {
    let files; try { files = readdirSync(d); } catch { continue; }
    for (const f of files) {
        if (!f.endsWith('.desktop')) continue;
        let txt; try { txt = readFileSync(join(d, f), 'utf8'); } catch { continue; }
        const m = txt.match(/^Icon=(.+)$/m);
        if (!m) continue;
        const v = m[1].trim();
        if (v.startsWith('/') || /\.(png|svg|xpm)$/.test(v)) continue;
        appIcons.add(v);
        byCtx.apps.add(v);
    }
}

const lucide = readdirSync(LUCIDE).filter(f => f.endsWith('.svg'))
    .map(f => basename(f, '.svg')).sort();

const out = {
    generatedAt: 'static',
    counts: {},
    symbolic: [...symbolicSet].sort(),
    contexts: {},
    appIcons: [...appIcons].sort(),
    lucide,
};
for (const c of CTX) { out.contexts[c] = [...byCtx[c]].sort(); out.counts[c] = byCtx[c].size; }
out.counts.symbolic = symbolicSet.size;
out.counts.appIcons = appIcons.size;
out.counts.lucide = lucide.length;

mkdirSync(`${HERE}/build/icons`, {recursive: true});
writeFileSync(`${HERE}/build/icons/worklist.json`, JSON.stringify(out, null, 1));
console.log('counts:', JSON.stringify(out.counts));
console.log('total unique names to cover:',
    new Set(CTX.flatMap(c => [...byCtx[c]])).size);
