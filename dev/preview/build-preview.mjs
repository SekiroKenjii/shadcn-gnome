#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { contrastReport } from '../../src/commands/contrast.mjs';
import { themeBuildDir } from '../../src/core/paths.mjs';
import { wallpaperFileName } from '../../src/targets/wallpapers.mjs';
import { loadTheme, SCHEMES } from '../../src/theme/catalog.mjs';
import { resolvePalette } from '../../src/theme/palette.mjs';

const SAMPLE_ICONS = {
  actions: [
    'document-new',
    'document-open',
    'document-save',
    'edit-undo',
    'edit-copy',
    'edit-delete',
    'edit-find',
    'view-grid',
    'view-list',
    'open-menu',
    'go-previous',
    'go-next',
    'list-add',
    'window-close',
    'window-maximize',
    'media-playback-start',
    'system-shutdown',
  ],
  status: [
    'network-wireless-signal-excellent',
    'network-wired',
    'bluetooth-active',
    'audio-volume-high',
    'audio-volume-muted',
    'microphone-sensitivity-high',
    'battery-full-charging',
    'airplane-mode',
    'night-light',
    'dark-mode',
    'dialog-warning',
    'dialog-information',
  ],
  places: [
    'user-home',
    'user-desktop',
    'folder-documents',
    'folder-download',
    'folder-music',
    'folder-pictures',
    'folder-videos',
    'folder-templates',
    'folder-publicshare',
    'folder-projects',
    'folder-remote',
    'folder-git',
    'user-trash',
  ],
  emblems: [
    'emblem-unreadable',
    'emblem-readonly',
    'emblem-symbolic-link',
    'emblem-shared',
    'emblem-synchronizing',
    'emblem-important',
    'emblem-favorite',
    'emblem-default',
  ],
  apps: ['org.gnome.Nautilus', 'org.gnome.Settings', 'org.gnome.Console', 'org.gnome.Boxes', 'org.gnome.Showtime', 'org.gnome.Decibels', 'firefox', 'code'],
};

const { values } = parseArgs({ options: { theme: { type: 'string', short: 't', default: 'graphite' } } });
const theme = loadTheme(values.theme);
const build = themeBuildDir(theme.id);
if (!existsSync(`${build}/icons`)) throw new Error(`build ${theme.id} first: node bin/shadcn-gnome.mjs build -t ${theme.id}`);

const inline = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
const dataUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

function swatches(palette) {
  return Object.entries(palette)
    .filter(([, value]) => value.startsWith('#'))
    .map(([name, value]) => `<li><span style="background:${value}"></span><code>${name}</code><code>${value}</code></li>`)
    .join('');
}

function iconGrid(scheme) {
  return Object.entries(SAMPLE_ICONS)
    .map(([context, names]) => {
      const cells = names
        .map((name) => {
          const symbolic = inline(`${build}/icons/Lucide/scalable/${context}/${name}-symbolic.svg`);
          const plainTheme = scheme === 'light' ? 'Lucide-Light' : 'Lucide';
          const plain = inline(`${build}/icons/${plainTheme}/scalable/${context}/${name}.svg`);
          if (!symbolic) return `<figure class="missing"><figcaption>${name}</figcaption></figure>`;
          return `<figure><span class="symbolic">${symbolic}</span><img src="${dataUri(plain)}" width="48" height="48" alt=""><figcaption>${name}</figcaption></figure>`;
        })
        .join('');
      return `<h3>${context}</h3><div class="icons">${cells}</div>`;
    })
    .join('');
}

function cursorGrid(variant) {
  const directory = `${build}/cursors/${variant}/cursors_scalable`;
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => {
      const [first] = JSON.parse(readFileSync(`${directory}/${entry.name}/metadata.json`, 'utf8'));
      const svg = readFileSync(`${directory}/${entry.name}/${first.filename}`, 'utf8');
      const hotspot = `left:${(first.hotspot_x / first.nominal_size) * 48}px;top:${(first.hotspot_y / first.nominal_size) * 48}px`;
      return `<figure><span class="cursor"><img src="${dataUri(svg)}" width="48" height="48" alt=""><i style="${hotspot}"></i></span><figcaption>${entry.name}</figcaption></figure>`;
    })
    .join('');
}

const sections = SCHEMES.map((scheme) => {
  const palette = resolvePalette(theme, scheme);
  const wallpaper = dataUri(inline(`${build}/backgrounds/${wallpaperFileName(theme.wallpaper, scheme)}`));
  const checks = contrastReport(palette)
    .map((check) => `<li>${check.label}: <b>${check.ratio.toFixed(2)}:1</b> ${check.grade}</li>`)
    .join('');
  return `<section class="scheme" style="--bg:${palette.bg};--fg:${palette.fg};--card:${palette.card};--bd:${palette.border};--mut:${palette.mutedFg}">
    <h2>${theme.label} · ${scheme}</h2>
    <div class="wall" style="background-image:url('${wallpaper}')"></div>
    <ul class="checks">${checks}</ul>
    <ul class="swatches">${swatches(palette)}</ul>
    ${iconGrid(scheme)}
    <h3>cursors · Shadcn</h3><div class="icons">${cursorGrid('Shadcn')}</div>
    <h3>cursors · Shadcn-Dark</h3><div class="icons">${cursorGrid('Shadcn-Dark')}</div>
  </section>`;
}).join('');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${theme.label} preview</title><style>
body{margin:0;font:13px/1.4 system-ui,sans-serif;display:grid;grid-template-columns:1fr 1fr}
.scheme{background:var(--bg);color:var(--fg);padding:24px}
h2{margin:0 0 12px}h3{margin:18px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}
.wall{height:140px;border:1px solid var(--bd);background-size:cover;border-radius:8px}
.swatches{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0;list-style:none}
.swatches li{display:flex;gap:6px;align-items:center}.swatches span{width:18px;height:18px;border:1px solid var(--bd);border-radius:4px}
.icons{display:grid;grid-template-columns:repeat(9,1fr);gap:6px}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:1px solid var(--bd);border-radius:6px;background:var(--card)}
figure.missing{border-color:red}figcaption{font:10px ui-monospace,monospace;color:var(--mut);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.symbolic svg{width:16px;height:16px;color:var(--fg)}
.cursor{position:relative;display:block;width:48px;height:48px;background:repeating-conic-gradient(#8884 0 25%,transparent 0 50%) 0 0/8px 8px}
.cursor i{position:absolute;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:#e06666}
</style></head><body>${sections}</body></html>`;

const target = `${build}/preview.html`;
writeFileSync(target, html);
console.log(target);
