// generate-icons.mjs: assemble the "Lucide" freedesktop icon theme for a given
// theme (build/<theme>/Lucide). Prefers the vendored assets/mapping.json; falls
// back to the agent pipeline outputs (build/icons/out/*.json) over the pre-pass
// suggestions when regenerating the mapping from scratch. The plain-icon fill
// color comes from the theme (iconFg); symbolic icons keep currentColor so GTK
// recolors them. Data tables live in assets/icon-overrides.json, not here.
// Usage: node lib/generate-icons.mjs [theme]   (default: graphite; or THEME=env)
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { outline } from './lib-outline.mjs';
import { overlay } from './overlay-icons.mjs';
import {
  loadIconOverrides,
  loadTheme,
  lucideDir,
  PATHS,
  resolveThemeName,
  tablerDir,
  themeBuildDir,
} from './config.mjs';

const theme = loadTheme(resolveThemeName());
const FG = theme.iconFg || theme.colors.fg; // plain-icon fill for this theme
const OV = loadIconOverrides();

const ICONS = `${PATHS.build}/icons`; // dev pipeline artifacts (chunks/out)
const LUCIDE_DIR = lucideDir();
const TABLER_DIR = tablerDir();
const OUT = `${themeBuildDir(theme.name)}/Lucide`;
const VENDORED = PATHS.mapping;

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
// End users always consume the vendored assets/mapping.json. Only rebuild it
// from the enumerate/prepass pipeline when explicitly asked (REBUILD_MAPPING=1),
// so a stale build/icons/out can never silently override the shipped mapping.
const finalMap = {};
for (const c of CTX) finalMap[c] = {};
let agentApplied = 0;
let agentInvalid = 0;
let usedVendored = false;
const REBUILD = process.env.REBUILD_MAPPING === '1';

if (existsSync(VENDORED) && !(REBUILD && existsSync(`${ICONS}/chunks`))) {
  if (REBUILD)
    console.warn('  REBUILD_MAPPING set but build/icons/chunks missing. Run enumerate + prepass first; using vendored mapping');
  const m = JSON.parse(readFileSync(VENDORED, 'utf8'));
  for (const c of Object.keys(m)) finalMap[c] = m[c];
  usedVendored = true;
  console.log('using vendored assets/mapping.json');
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

// 2. generic placeholders that MUST exist (from icon-overrides.json)
for (const [ctx, m] of Object.entries(OV.generic || {}))
  for (const [name, lu] of Object.entries(m))
    if (finalMap[ctx] && !finalMap[ctx][name] && LU.has(lu))
      finalMap[ctx][name] = lu;

// 2a. forced remaps that win over agent + generic (deliberate icon choices).
for (const [ctx, m] of Object.entries(OV.overrides || {}))
  for (const [name, lu] of Object.entries(m))
    if (finalMap[ctx] && LU.has(lu)) finalMap[ctx][name] = lu;

// 2b. persist the resolved mapping ONLY when we regenerated it from the agent
//     pipeline; consuming the vendored file must not rewrite it (keeps git clean).
if (!usedVendored) {
  writeFileSync(VENDORED, JSON.stringify(finalMap, null, 0));
  console.log('wrote resolved assets/mapping.json');
}

// 3. emit SVGs
rmSync(OUT, { recursive: true, force: true });
const svgCache = {};
const readLucide = (n) =>
  (svgCache[n] ??= readFileSync(`${LUCIDE_DIR}/${n}.svg`, 'utf8'));
// symbolic outline cache (same lucide icon reused across many names).
const symCache = {};
const outlineOf = (n) =>
  (symCache[n] ??= outline(readLucide(n), { pad: -1, strokeWidth: 1.25 }));
// plain: keep Lucide's real strokes, baked to the theme fg. These are the LARGE
// icons (folders in Files, app-grid tiles, application icons). Pad them in so
// they read smaller and lighter, stroke 1.25.
const bake = (s) =>
  s
    .replace(/\swidth="24"/, ' width="16"')
    .replace(/\sheight="24"/, ' height="16"')
    .replace(/viewBox="0 0 24 24"/, 'viewBox="-3 -3 30 30"') // pad -> smaller glyph
    .replaceAll('stroke-width="2"', 'stroke-width="1.25"') // thinner
    .replaceAll('stroke="currentColor"', `stroke="${FG}"`)
    .replaceAll('fill="currentColor"', `fill="${FG}"`);

// Only Lucide-ify SYSTEM app icons; third-party apps keep their own icon so
// they stay recognizable. Both the name-prefix families and the explicit
// allowlist live in icon-overrides.json (systemAppPrefixes / systemApps).
const SYSTEM_APP_SET = new Set(OV.systemApps || []);
const SYSTEM_APP_PREFIXES = OV.systemAppPrefixes || [];
const SYSTEM_APP = (name) =>
  SYSTEM_APP_PREFIXES.some((p) => name.startsWith(p)) ||
  SYSTEM_APP_SET.has(name);

let files = 0;
let appsSkipped = 0;
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
  overlayStats = overlay({ OUT, LUCIDE_DIR, TABLER_DIR, FG, dirsUsed, overrides: OV });
} else {
  console.warn('  @tabler/icons not installed, skipping brand app icons');
}

// 4. index.theme
const dirList = [...dirsUsed].sort();
const sections = dirList
  .map((dd) => {
    const ctx = dd.split('/')[1];
    return `[${dd}]\nContext=${CTX_LABEL[ctx]}\nMinSize=8\nMaxSize=512\nSize=16\nType=Scalable`;
  })
  .join('\n\n');
const index = `[Icon Theme]
Name=Lucide
Comment=Lucide line icons, monochrome, shadcn aesthetic (${theme.label})
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
console.log(`unique icon names covered: ${total} -> ${OUT}`);
