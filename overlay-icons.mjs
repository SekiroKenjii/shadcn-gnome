// overlay-icons.mjs — after the base Lucide theme is generated, overlay:
//   * app icons for popular apps, drawn from Tabler's brand-* set (same
//     outline style as Lucide) so each app keeps its identity in Lucide style;
//   * distinctive folder icons for XDG/special folders (a Lucide folder
//     variant, or a folder composed with a small glyph emblem).
// Everything runs through the same stroke->fill pipeline so GTK recolors them
// cleanly. Apps with no Tabler brand are left untouched (they keep their own).
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {outline, composeFolder} from './lib-outline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// app icon-name (as it appears in .desktop Icon=) -> Tabler brand file
export const APP_BRANDS = {
    firefox: 'brand-firefox', 'firefox-esr': 'brand-firefox',
    'org.mozilla.firefox': 'brand-firefox', firefox_firefox: 'brand-firefox',
    'google-chrome': 'brand-chrome', 'google-chrome-stable': 'brand-chrome',
    chromium: 'brand-chrome', 'chromium-browser': 'brand-chrome',
    'org.chromium.Chromium': 'brand-chrome',
    'microsoft-edge': 'brand-edge', 'microsoft-edge-dev': 'brand-edge',
    opera: 'brand-opera', 'com.opera.Opera': 'brand-opera',
    code: 'brand-vscode', 'code-oss': 'brand-vscode', vscode: 'brand-vscode',
    'com.visualstudio.code': 'brand-vscode', 'visual-studio-code': 'brand-vscode',
    code_code: 'brand-vscode',
    discord: 'brand-discord', 'com.discordapp.Discord': 'brand-discord',
    telegram: 'brand-telegram', 'telegram-desktop': 'brand-telegram',
    'org.telegram.desktop': 'brand-telegram',
    slack: 'brand-slack', 'com.slack.Slack': 'brand-slack',
    'signal-desktop': 'brand-signal', 'org.signal.Signal': 'brand-signal',
    whatsapp: 'brand-whatsapp', 'whatsapp-for-linux': 'brand-whatsapp',
    spotify: 'brand-spotify', 'com.spotify.Client': 'brand-spotify',
    vlc: 'brand-vlc', 'org.videolan.VLC': 'brand-vlc',
    steam: 'brand-steam', 'com.valvesoftware.Steam': 'brand-steam',
    Zoom: 'brand-zoom', zoom: 'brand-zoom', 'us.zoom.Zoom': 'brand-zoom',
    teams: 'brand-teams', 'teams-for-linux': 'brand-teams',
    skypeforlinux: 'brand-skype', 'com.skype.Client': 'brand-skype',
    notion: 'brand-notion', 'notion-app': 'brand-notion',
    'figma-linux': 'brand-figma', figma: 'brand-figma',
    blender: 'brand-blender', 'org.blender.Blender': 'brand-blender',
    'github-desktop': 'brand-github', gitlab: 'brand-gitlab',
    docker: 'brand-docker', 'docker-desktop': 'brand-docker',
    mongodb: 'brand-mongodb', mysql: 'brand-mysql', 'mysql-workbench': 'brand-mysql',
    cloudflare: 'brand-cloudflare', 'cloudflare-warp': 'brand-cloudflare',
    'com.cloudflare.WarpCli': 'brand-cloudflare',
};

// Apps with no Tabler brand — hand-drawn Lucide-style marks in custom-icons/.
// (Icon= name as it appears in the .desktop -> file basename in custom-icons/)
export const CUSTOM_APPS = {
    'com.anthropic.Claude': 'claude', claude: 'claude',
    'anthropic-claude': 'claude', 'claude-desktop': 'claude',
    // name-based Icon= (theme overrides directly)
    'brave-browser': 'brave', 'com.brave.Browser': 'brave',
    'nvidia-settings': 'nvidia',
    'com.github.wwmm.easyeffects': 'easyeffects',
    // path-based apps (snap): these NAMES are used by the .desktop overrides in
    // ~/.local/share/applications that swap the absolute-path Icon= for a
    // themable name — see patch-desktop-icons.sh.
    'firmware-updater': 'firmware',
    'desktop-security-center': 'security',
    'snap-store': 'appcenter',
};

// freedesktop folder name -> a Lucide folder variant, or {glyph} to compose
export const FOLDER_ICONS = {
    'folder-documents': {glyph: 'file-text'},
    'folder-download': {variant: 'folder-down'},
    'folder-downloads': {variant: 'folder-down'},
    'folder-music': {glyph: 'music'},
    'folder-pictures': {glyph: 'image'},
    'folder-videos': {glyph: 'clapperboard'},
    'folder-templates': {glyph: 'layout-template'},
    'folder-publicshare': {glyph: 'share-2'},
    'user-desktop': {glyph: 'monitor'},
    'folder-remote': {variant: 'folder-symlink'},
    'folder-recent': {variant: 'folder-clock'},
    'folder-saved-search': {variant: 'folder-search'},
    'folder-git': {variant: 'folder-git'},
    'user-bookmarks': {variant: 'folder-bookmark'},
};

export function overlay({OUT, LUCIDE_DIR, TABLER_DIR, FG, dirsUsed}) {
    const bakeFill = s => s.replace('fill="currentColor"', `fill="${FG}"`);
    const rdL = n => readFileSync(`${LUCIDE_DIR}/${n}.svg`, 'utf8');
    let apps = 0, folders = 0;

    const AD = `${OUT}/scalable/apps`;
    for (const [name, brand] of Object.entries(APP_BRANDS)) {
        const p = `${TABLER_DIR}/${brand}.svg`;
        if (!existsSync(p)) continue;
        const src = readFileSync(p, 'utf8');
        mkdirSync(AD, {recursive: true});
        writeFileSync(`${AD}/${name}-symbolic.svg`, outline(src, {pad: 0}));   // panel/dash
        writeFileSync(`${AD}/${name}.svg`, bakeFill(outline(src, {pad: 3})));  // app grid (match system apps)
        apps++; dirsUsed.add('scalable/apps');
    }

    // Hand-drawn marks for brand-less apps (same pipeline + sizing as above).
    for (const [name, file] of Object.entries(CUSTOM_APPS)) {
        const p = `${HERE}/custom-icons/${file}.svg`;
        if (!existsSync(p)) continue;
        const src = readFileSync(p, 'utf8');
        mkdirSync(AD, {recursive: true});
        writeFileSync(`${AD}/${name}-symbolic.svg`, outline(src, {pad: 0}));
        writeFileSync(`${AD}/${name}.svg`, bakeFill(outline(src, {pad: 3})));
        apps++; dirsUsed.add('scalable/apps');
    }

    const PD = `${OUT}/scalable/places`;
    const folderBase = rdL('folder');
    for (const [name, spec] of Object.entries(FOLDER_ICONS)) {
        let sym;
        if (spec.variant) {
            if (!existsSync(`${LUCIDE_DIR}/${spec.variant}.svg`)) continue;
            sym = outline(rdL(spec.variant), {pad: 3});
        } else {
            if (!existsSync(`${LUCIDE_DIR}/${spec.glyph}.svg`)) continue;
            sym = composeFolder(folderBase, rdL(spec.glyph), {pad: 3});
        }
        mkdirSync(PD, {recursive: true});
        writeFileSync(`${PD}/${name}-symbolic.svg`, sym);
        writeFileSync(`${PD}/${name}.svg`, bakeFill(sym));
        folders++; dirsUsed.add('scalable/places');
    }
    return {apps, folders};
}
