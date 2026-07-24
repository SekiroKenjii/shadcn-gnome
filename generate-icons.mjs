// generate-icons.mjs — assemble the "Lucide" freedesktop icon theme from the
// agent mappings (build/icons/out/*.json), with pre-pass suggestions as the
// safety net. Emits build/Lucide/ (scalable/<context>/{name.svg,name-symbolic.svg})
// + index.theme. Lucide SVGs use stroke="currentColor": kept as-is for the
// -symbolic variant (GTK recolors via currentColor), baked to the graphite
// foreground for the plain variant (legible on the dark desktop).
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outline } from './lib-outline.mjs';
import { overlay } from './overlay-icons.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ICONS = `${HERE}/build/icons`;
const LUCIDE_DIR = existsSync(`${HERE}/node_modules/lucide-static/icons`)
  ? `${HERE}/node_modules/lucide-static/icons`
  : `${HERE}/.work/node_modules/lucide-static/icons`;
const TABLER_DIR = `${HERE}/node_modules/@tabler/icons/icons/outline`;
const OUT = `${HERE}/build/Lucide`;
const FG = '#d9d9d9'; // graphite foreground for plain icons
const CTX_LABEL = {
  actions: 'Actions',
  status: 'Status',
  devices: 'Devices',
  places: 'Places',
  mimetypes: 'MimeTypes',
  emblems: 'Emblems',
  categories: 'Categories',
  apps: 'Applications',
};

// Lucide inventory straight from the package (no worklist.json needed).
const LU = new Set(
  readdirSync(LUCIDE_DIR)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4)),
);
const CTX = [
  'actions',
  'status',
  'devices',
  'places',
  'mimetypes',
  'emblems',
  'categories',
  'apps',
];

// 1. build the final context->{name->lucide} map.
// Prefer a vendored mapping.json (portable, no workflow needed); otherwise
// merge the agent outputs (out/*.json) over the pre-pass suggestions.
const finalMap = {};
for (const c of CTX) finalMap[c] = {};
let agentApplied = 0,
  agentInvalid = 0;
const VENDORED = `${HERE}/mapping.json`;

if (existsSync(VENDORED) && !existsSync(`${ICONS}/out`)) {
  const m = JSON.parse(readFileSync(VENDORED, 'utf8'));
  for (const c of Object.keys(m)) finalMap[c] = m[c];
  console.log('using vendored mapping.json');
} else {
  // seed from pre-pass chunk suggestions (always valid) so nothing is missing
  for (const f of readdirSync(`${ICONS}/chunks`)) {
    const { context, icons } = JSON.parse(
      readFileSync(`${ICONS}/chunks/${f}`, 'utf8'),
    );
    for (const it of icons) finalMap[context][it.name] = it.suggest;
  }
  // overlay agent results where valid
  if (existsSync(`${ICONS}/out`)) {
    for (const f of readdirSync(`${ICONS}/out`)) {
      if (!f.endsWith('.json')) continue;
      let data;
      try {
        data = JSON.parse(readFileSync(`${ICONS}/out/${f}`, 'utf8'));
      } catch {
        console.warn(`  skip malformed ${f}`);
        continue;
      }
      const ctx = data.context || f.split('-')[0];
      for (const mm of data.mappings || []) {
        if (!mm || !mm.name || !mm.lucide) continue;
        if (finalMap[ctx] === undefined) continue;
        if (LU.has(mm.lucide)) {
          finalMap[ctx][mm.name] = mm.lucide;
          agentApplied++;
        } else agentInvalid++; // keep the pre-pass suggestion
      }
    }
  }
}

// 2. generic placeholders that MUST exist (context, name -> lucide)
const GENERIC = {
  mimetypes: {
    'application-x-executable': 'square-chevron-right',
    'application-x-generic': 'file',
    'text-x-generic': 'file-text',
    'image-x-generic': 'file-image',
    'audio-x-generic': 'file-audio',
    'video-x-generic': 'file-video',
    'package-x-generic': 'package',
    'font-x-generic': 'type',
    'application-octet-stream': 'file',
    unknown: 'file-question',
    'gtk-file': 'file',
    'application-x-archive': 'file-archive',
    'application-pdf': 'file-text',
  },
  places: {
    folder: 'folder',
    'inode-directory': 'folder',
    'folder-remote': 'folder-symlink',
    'user-home': 'house',
    'user-desktop': 'monitor',
    'user-trash': 'trash-2',
    'network-server': 'server',
    'network-workgroup': 'network',
    'start-here': 'house',
  },
  devices: {
    'drive-harddisk': 'hard-drive',
    'drive-removable-media': 'usb',
    computer: 'monitor',
    'media-optical': 'disc',
    'input-keyboard': 'keyboard',
    'input-mouse': 'mouse',
  },
  apps: {
    'application-default-icon': 'app-window',
    'application-x-executable': 'square-chevron-right',
  },
  status: {
    'image-missing': 'image-off',
    'image-loading': 'loader',
    'dialog-error': 'circle-x',
  },
  actions: { 'gtk-missing-image': 'image-off' },
};
for (const [ctx, m] of Object.entries(GENERIC))
  for (const [name, lu] of Object.entries(m))
    if (!finalMap[ctx][name] && LU.has(lu)) finalMap[ctx][name] = lu;

// 2a. forced remaps — win over agent + generic (deliberate icon choices).
const OVERRIDE = {
  apps: {
    // the software "store" reads better as overlapping tool-case than a shopfront
    'org.gnome.Software': 'tool-case',
    'gnome-software': 'tool-case',
    'software-center': 'tool-case',
    'software-store': 'tool-case',
    softwarecenter: 'tool-case',
    ubuntusoftware: 'tool-case',
  },
};
for (const [ctx, m] of Object.entries(OVERRIDE))
  for (const [name, lu] of Object.entries(m))
    if (LU.has(lu)) finalMap[ctx][name] = lu;

// 2b. persist the resolved mapping so the theme can be regenerated portably
//     (vendored in the repo; the workflow/agent outputs are not needed to rebuild).
writeFileSync(VENDORED, JSON.stringify(finalMap, null, 0));

// 3. emit SVGs
rmSync(OUT, { recursive: true, force: true });
const svgCache = {};
const readLucide = (n) =>
  (svgCache[n] ??= readFileSync(`${LUCIDE_DIR}/${n}.svg`, 'utf8'));
// symbolic outline cache (same lucide icon reused across many names).
// Symbolic icons live in small UI slots (panel, quick settings, sidebars) —
// use a slight NEGATIVE pad so the glyph fills a touch more of its box (a bit
// bigger than default), stroke 1.25.
const symCache = {};
const outlineOf = (n) =>
  (symCache[n] ??= outline(readLucide(n), { pad: -1, strokeWidth: 1.25 }));
// plain: keep Lucide's real strokes, baked to the graphite fg. These are the
// LARGE icons (folders in Files, app-grid tiles, application icons) — pad them
// in so they read smaller and lighter, stroke 1.25.
const bake = (s) =>
  s
    .replace(/\swidth="24"/, ' width="16"')
    .replace(/\sheight="24"/, ' height="16"')
    .replace(/viewBox="0 0 24 24"/, 'viewBox="-3 -3 30 30"') // pad -> smaller glyph
    .replace(/stroke-width="2"/g, 'stroke-width="1.25"') // thinner
    .replace(/stroke="currentColor"/g, `stroke="${FG}"`)
    .replace(/fill="currentColor"/g, `fill="${FG}"`);

// Only Lucide-ify SYSTEM app icons; third-party apps keep their own icon so
// they stay recognizable (a generic Lucide for every app loses identity).
const SYSTEM_APP = (name) =>
  /^(org\.gnome\.|gnome-|application-x-|application-default|preferences-)/.test(
    name,
  ) ||
  [
    'nautilus',
    'yelp',
    'ptyxis',
    'gnome',
    'system-file-manager',
    'system-users',
    'user-info',
    'utilities-terminal',
  ].includes(name);

let files = 0,
  appsSkipped = 0;
const dirsUsed = new Set();
for (const [ctx, m] of Object.entries(finalMap)) {
  const dir = `${OUT}/scalable/${ctx}`;
  let any = false;
  for (const [name, lu] of Object.entries(m)) {
    if (ctx === 'apps' && !SYSTEM_APP(name)) {
      appsSkipped++;
      continue;
    }
    let src;
    try {
      src = readLucide(lu);
    } catch {
      continue;
    } // lucide file vanished (shouldn't)
    mkdirSync(dir, { recursive: true });
    // -symbolic: fill-only outline so GTK's fill-based recoloring renders
    // clean lines (a raw stroke icon would be filled into a solid blob).
    writeFileSync(`${dir}/${name}-symbolic.svg`, outlineOf(lu));
    writeFileSync(`${dir}/${name}.svg`, bake(src));
    files += 2;
    any = true;
  }
  if (any) dirsUsed.add(`scalable/${ctx}`);
}

// 3b. overlay recognizable app icons (Tabler brands) + distinctive folder icons
let overlayStats = { apps: 0, folders: 0 };
if (existsSync(TABLER_DIR)) {
  overlayStats = overlay({ OUT, LUCIDE_DIR, TABLER_DIR, FG, dirsUsed });
} else {
  console.warn('  @tabler/icons not installed — skipping brand app icons');
}

// 4. index.theme
const dirList = [...dirsUsed].sort();
const sections = dirList
  .map((d) => {
    const ctx = d.split('/')[1];
    return `[${d}]\nContext=${CTX_LABEL[ctx]}\nMinSize=8\nMaxSize=512\nSize=16\nType=Scalable`;
  })
  .join('\n\n');
const index = `[Icon Theme]
Name=Lucide
Comment=Lucide line icons — monochrome, shadcn aesthetic
Inherits=Adwaita,hicolor
Example=folder
FollowsColorScheme=true
Directories=${dirList.join(',')}

${sections}
`;
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/index.theme`, index);

console.log(
  `agent mappings applied: ${agentApplied}, invalid(dropped): ${agentInvalid}`,
);
console.log(
  `contexts: ${dirList.length}, svg files: ${files}, non-system apps kept-own: ${appsSkipped}`,
);
console.log(
  `overlay: ${overlayStats.apps} brand app icons, ${overlayStats.folders} folder icons`,
);
const total = Object.values(finalMap).reduce(
  (a, m) => a + Object.keys(m).length,
  0,
);
console.log(`unique icon names covered: ${total}`);
