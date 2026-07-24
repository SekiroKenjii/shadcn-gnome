// prepass-icons.mjs — algorithmic first-pass mapping freedesktop icon names to
// Lucide, producing per-context chunk files (name + suggestion + confidence)
// for the workflow agents to refine, plus lucide-list.txt.
import {readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const wl = JSON.parse(readFileSync(`${HERE}/build/icons/worklist.json`, 'utf8'));
const LU = new Set(wl.lucide);
const has = n => LU.has(n);

// ---- exact freedesktop -> lucide -----------------------------------------
const EXACT = {
  'user-home': 'house', 'go-home': 'house', 'start-here': 'house',
  'user-desktop': 'monitor', 'user-trash': 'trash-2', 'user-trash-full': 'trash',
  'user-bookmarks': 'bookmark', 'folder': 'folder', 'inode-directory': 'folder',
  'edit-copy': 'copy', 'edit-cut': 'scissors', 'edit-paste': 'clipboard-paste',
  'edit-delete': 'trash-2', 'edit-undo': 'undo-2', 'edit-redo': 'redo-2',
  'edit-find': 'search', 'edit-find-replace': 'search-code', 'edit-clear': 'x',
  'edit-select-all': 'list-checks', 'edit-rename': 'pencil',
  'document-new': 'file-plus', 'document-open': 'folder-open', 'document-open-recent': 'clock',
  'document-save': 'save', 'document-save-as': 'save', 'document-print': 'printer',
  'document-print-preview': 'file-search', 'document-properties': 'file-cog',
  'document-send': 'send', 'document-edit': 'file-pen', 'document-revert': 'undo-2',
  'go-up': 'arrow-up', 'go-down': 'arrow-down', 'go-next': 'arrow-right',
  'go-previous': 'arrow-left', 'go-first': 'chevrons-left', 'go-last': 'chevrons-right',
  'go-top': 'chevrons-up', 'go-bottom': 'chevrons-down', 'go-jump': 'corner-down-right',
  'list-add': 'plus', 'list-remove': 'minus', 'list-remove-all': 'list-x',
  'view-refresh': 'refresh-cw', 'view-fullscreen': 'maximize', 'view-restore': 'minimize',
  'view-list': 'list', 'view-grid': 'grid-3x3', 'view-more': 'ellipsis',
  'view-list-symbolic': 'list', 'view-app-grid': 'layout-grid', 'view-continuous': 'rows-3',
  'view-dual': 'columns-2', 'view-paged': 'square', 'view-sort-ascending': 'arrow-up-narrow-wide',
  'view-sort-descending': 'arrow-down-wide-narrow', 'view-wrapped': 'wrap-text',
  'view-hidden': 'eye-off', 'view-reveal': 'eye', 'view-conceal': 'eye-off',
  'window-close': 'x', 'window-minimize': 'minus', 'window-maximize': 'square',
  'window-new': 'app-window', 'window-restore': 'copy',
  'tab-new': 'plus', 'tab-close': 'x',
  'media-playback-start': 'play', 'media-playback-pause': 'pause',
  'media-playback-stop': 'square', 'media-skip-forward': 'skip-forward',
  'media-skip-backward': 'skip-back', 'media-seek-forward': 'fast-forward',
  'media-seek-backward': 'rewind', 'media-record': 'circle', 'media-eject': 'eject',
  'media-playlist-repeat': 'repeat', 'media-playlist-shuffle': 'shuffle',
  'audio-volume-high': 'volume-2', 'audio-volume-medium': 'volume-1',
  'audio-volume-low': 'volume', 'audio-volume-muted': 'volume-x', 'audio-volume-overamplified': 'volume-2',
  'audio-headphones': 'headphones', 'audio-speakers': 'speaker', 'audio-card': 'audio-lines',
  'audio-input-microphone': 'mic', 'microphone-sensitivity-muted': 'mic-off',
  'network-wireless': 'wifi', 'network-wired': 'cable', 'network-offline': 'wifi-off',
  'network-vpn': 'shield-check', 'network-cellular': 'signal', 'network-transmit': 'arrow-up',
  'network-receive': 'arrow-down', 'network-transmit-receive': 'arrow-up-down',
  'network-error': 'wifi-off', 'network-wireless-hotspot': 'wifi',
  'battery-full': 'battery-full', 'battery-good': 'battery-medium', 'battery-low': 'battery-low',
  'battery-caution': 'battery-warning', 'battery-empty': 'battery', 'battery-missing': 'battery-warning',
  'battery-full-charging': 'battery-charging', 'battery-charging': 'battery-charging',
  'bluetooth': 'bluetooth', 'bluetooth-active': 'bluetooth-connected', 'bluetooth-disabled': 'bluetooth-off',
  'system-search': 'search', 'system-shutdown': 'power', 'system-log-out': 'log-out',
  'system-lock-screen': 'lock', 'system-reboot': 'rotate-cw', 'system-run': 'play',
  'system-help': 'circle-help', 'system-users': 'users', 'system-file-manager': 'folder',
  'system-software-install': 'package-plus', 'system-software-update': 'package-check',
  'preferences-system': 'settings', 'preferences-other': 'sliders-horizontal',
  'preferences-desktop': 'settings', 'preferences-desktop-theme': 'palette',
  'preferences-desktop-wallpaper': 'image', 'preferences-desktop-display': 'monitor',
  'preferences-desktop-keyboard': 'keyboard', 'preferences-desktop-font': 'type',
  'preferences-desktop-locale': 'languages', 'preferences-desktop-accessibility': 'accessibility',
  'preferences-desktop-screensaver': 'monitor-off', 'preferences-desktop-notifications': 'bell',
  'preferences-system-network': 'network', 'preferences-system-privacy': 'shield',
  'preferences-system-time': 'clock', 'preferences-system-devices': 'hard-drive',
  'dialog-information': 'info', 'dialog-warning': 'triangle-alert', 'dialog-error': 'circle-x',
  'dialog-question': 'circle-help', 'dialog-password': 'key-round', 'dialog-apply': 'check',
  'security-high': 'shield-check', 'security-medium': 'shield', 'security-low': 'shield-alert',
  'changes-allow': 'lock-open', 'changes-prevent': 'lock',
  'emblem-favorite': 'star', 'emblem-important': 'circle-alert', 'emblem-shared': 'users',
  'emblem-symbolic-link': 'link', 'emblem-readonly': 'lock', 'emblem-unreadable': 'eye-off',
  'emblem-system': 'cog', 'emblem-ok': 'check', 'emblem-default': 'check-check',
  'emblem-new': 'sparkles', 'emblem-documents': 'file-text', 'emblem-downloads': 'download',
  'emblem-photos': 'image', 'emblem-music': 'music', 'emblem-videos': 'video',
  'emblem-mail': 'mail', 'emblem-web': 'globe', 'emblem-synchronizing': 'refresh-cw',
  'emblem-generic': 'tag', 'emblem-urgent': 'circle-alert', 'emblem-package': 'package',
  'mail-send': 'send', 'mail-reply-sender': 'reply', 'mail-reply-all': 'reply-all',
  'mail-forward': 'forward', 'mail-mark-important': 'flag', 'mail-mark-junk': 'trash-2',
  'mail-mark-read': 'mail-open', 'mail-mark-unread': 'mail', 'mail-message-new': 'mail-plus',
  'mail-unread': 'mail', 'mail-read': 'mail-open', 'mail-attachment': 'paperclip',
  'call-start': 'phone', 'call-stop': 'phone-off', 'call-missed': 'phone-missed',
  'contact-new': 'user-plus', 'address-book-new': 'contact', 'x-office-address-book': 'contact',
  'appointment-new': 'calendar-plus', 'appointment-missed': 'calendar-x', 'x-office-calendar': 'calendar',
  'printer': 'printer', 'printer-network': 'printer', 'printer-error': 'printer', 'printer-warning': 'printer',
  'scanner': 'scan', 'camera-photo': 'camera', 'camera-video': 'video', 'camera-web': 'webcam',
  'drive-harddisk': 'hard-drive', 'drive-optical': 'disc', 'drive-removable-media': 'usb',
  'drive-multidisk': 'hard-drive', 'media-flash': 'usb', 'media-optical': 'disc',
  'media-floppy': 'save', 'media-tape': 'circle', 'media-removable': 'usb',
  'computer': 'monitor', 'computer-laptop': 'laptop', 'phone': 'smartphone',
  'multimedia-player': 'smartphone', 'tablet': 'tablet-smartphone', 'video-display': 'monitor',
  'input-keyboard': 'keyboard', 'input-mouse': 'mouse', 'input-gaming': 'gamepad-2',
  'input-tablet': 'tablet', 'input-touchpad': 'square-mouse-pointer', 'input-dialpad': 'grid-3x3',
  'weather-clear': 'sun', 'weather-clear-night': 'moon', 'weather-few-clouds': 'cloud-sun',
  'weather-few-clouds-night': 'cloud-moon', 'weather-overcast': 'cloud', 'weather-showers': 'cloud-rain',
  'weather-showers-scattered': 'cloud-drizzle', 'weather-snow': 'cloud-snow',
  'weather-storm': 'cloud-lightning', 'weather-fog': 'cloud-fog', 'weather-windy': 'wind',
  'weather-severe-alert': 'cloud-alert',
  'zoom-in': 'zoom-in', 'zoom-out': 'zoom-out', 'zoom-fit-best': 'maximize',
  'zoom-original': 'search', 'find-location': 'map-pin',
  'format-text-bold': 'bold', 'format-text-italic': 'italic', 'format-text-underline': 'underline',
  'format-text-strikethrough': 'strikethrough', 'format-justify-left': 'align-left',
  'format-justify-center': 'align-center', 'format-justify-right': 'align-right',
  'format-justify-fill': 'align-justify', 'format-indent-more': 'indent-increase',
  'format-indent-less': 'indent-decrease', 'format-text-direction-ltr': 'pilcrow',
  'insert-image': 'image', 'insert-link': 'link', 'insert-text': 'type', 'insert-object': 'box',
  'insert-table': 'table', 'color-select': 'pipette', 'color-picker': 'pipette',
  'bookmark-new': 'bookmark-plus', 'user-bookmarks-symbolic': 'bookmark',
  'star-new': 'star', 'starred': 'star', 'non-starred': 'star-off', 'semi-starred': 'star-half',
  'help-about': 'info', 'help-contents': 'book-open', 'help-faq': 'circle-help', 'help-browser': 'circle-help',
  'open-menu': 'menu', 'view-more-horizontal': 'ellipsis', 'view-more-symbolic': 'ellipsis',
  'sidebar-show': 'panel-left', 'sidebar-hide': 'panel-left-close',
  'object-select': 'check', 'object-rotate-left': 'rotate-ccw', 'object-rotate-right': 'rotate-cw',
  'object-flip-horizontal': 'flip-horizontal', 'object-flip-vertical': 'flip-vertical',
  'process-stop': 'circle-x', 'process-working': 'loader', 'action-unavailable': 'ban',
  'accessories-calculator': 'calculator', 'accessories-text-editor': 'file-pen',
  'accessories-dictionary': 'book-a', 'accessories-character-map': 'type',
  'accessories-screenshot': 'camera', 'utilities-terminal': 'terminal',
  'utilities-system-monitor': 'activity', 'applications-system': 'cog',
  'applications-internet': 'globe', 'applications-multimedia': 'clapperboard',
  'applications-graphics': 'image', 'applications-development': 'code',
  'applications-games': 'gamepad-2', 'applications-office': 'briefcase',
  'applications-utilities': 'wrench', 'applications-science': 'flask-conical',
  'applications-education': 'graduation-cap', 'applications-engineering': 'drafting-compass',
  'applications-accessories': 'paperclip', 'applications-other': 'box',
  // mimetypes
  'text-x-generic': 'file-text', 'text-plain': 'file-text', 'text-html': 'file-code',
  'text-x-script': 'file-terminal', 'text-css': 'file-code', 'text-xml': 'file-code',
  'application-x-executable': 'square-chevron-right', 'application-x-generic': 'file',
  'image-x-generic': 'file-image', 'audio-x-generic': 'file-audio', 'video-x-generic': 'file-video',
  'package-x-generic': 'package', 'application-x-archive': 'file-archive', 'package': 'package',
  'application-pdf': 'file-text', 'x-office-document': 'file-text', 'x-office-spreadsheet': 'file-spreadsheet',
  'x-office-presentation': 'presentation', 'x-office-drawing': 'pen-tool', 'font-x-generic': 'type',
  'application-x-firmware': 'cpu', 'application-certificate': 'file-badge', 'application-x-addon': 'puzzle',
  'text-x-preview': 'file-search', 'application-rss+xml': 'rss', 'application-json': 'file-json',
  // faces / emotes
  'face-smile': 'smile', 'face-laugh': 'laugh', 'face-sad': 'frown', 'face-cool': 'smile',
  'face-wink': 'smile', 'face-angry': 'angry', 'face-crying': 'frown', 'face-surprise': 'smile',
  'face-plain': 'meh', 'face-monkey': 'smile', 'face-devilish': 'smile', 'face-kiss': 'smile',
};

// ---- prefix rules (applied if no exact) ----------------------------------
const PREFIX = [
  ['folder-download', 'folder-down'], ['folder-documents', 'folder'],
  ['folder-music', 'folder'], ['folder-pictures', 'folder'], ['folder-videos', 'folder'],
  ['folder-publicshare', 'folder-open'], ['folder-templates', 'folder'], ['folder-remote', 'folder-symlink'],
  ['folder-saved-search', 'folder-search'], ['folder-open', 'folder-open'], ['folder-new', 'folder-plus'],
  ['folder-visiting', 'folder-open'], ['folder-drag-accept', 'folder-input'], ['folder-', 'folder'],
  ['user-', 'user'], ['emblem-', 'badge'], ['weather-', 'cloud'], ['audio-', 'volume-2'],
  ['video-', 'video'], ['image-', 'image'], ['text-', 'file-text'], ['application-', 'file'],
  ['network-', 'network'], ['battery-', 'battery'], ['printer-', 'printer'], ['camera-', 'camera'],
  ['drive-', 'hard-drive'], ['media-', 'disc'], ['input-', 'keyboard'], ['mail-', 'mail'],
  ['format-', 'type'], ['document-', 'file'], ['view-', 'eye'], ['edit-', 'pencil'],
  ['go-', 'arrow-right'], ['list-', 'list'], ['window-', 'app-window'], ['tab-', 'square'],
  ['dialog-', 'message-square'], ['preferences-', 'settings'], ['applications-', 'box'],
  ['accessories-', 'wrench'], ['utilities-', 'wrench'], ['system-', 'cog'], ['security-', 'shield'],
  ['object-', 'box'], ['insert-', 'plus'], ['zoom-', 'search'], ['call-', 'phone'],
  ['face-', 'smile'], ['color-', 'palette'], ['bookmark', 'bookmark'], ['contact', 'contact'],
  ['appointment', 'calendar'], ['help-', 'circle-help'], ['process-', 'loader'],
];

// per-context default when nothing matches
const CTX_DEFAULT = {
  actions: 'square', status: 'circle', devices: 'box', places: 'folder',
  mimetypes: 'file', emblems: 'badge', categories: 'layout-grid', apps: 'app-window',
};

function tokens(n) { return n.replace(/-symbolic$/, '').split(/[-_.]/).filter(Boolean); }

function fuzzy(name) {
  // best lucide by token overlap
  const nt = new Set(tokens(name));
  let best = null, bestScore = 0;
  for (const l of wl.lucide) {
    const lt = tokens(l);
    let s = 0;
    for (const t of lt) if (nt.has(t)) s += 2;
    // partial token containment
    for (const t of nt) for (const u of lt) if (t.length > 3 && u.includes(t)) s += 1;
    if (s > bestScore) { bestScore = s; best = l; }
  }
  return bestScore >= 2 ? {lucide: best, conf: bestScore >= 4 ? 'med' : 'low'} : null;
}

function suggest(name, ctx) {
  const base = name.replace(/-symbolic$/, '');
  if (EXACT[base] && has(EXACT[base])) return {lucide: EXACT[base], conf: 'high'};
  if (has(base)) return {lucide: base, conf: 'high'};        // direct name match
  for (const [pre, lu] of PREFIX)
    if (base === pre || base.startsWith(pre)) if (has(lu)) {
      const f = fuzzy(base);                                  // prefer a fuzzy hit over generic prefix
      if (f && f.conf !== 'low') return f;
      return {lucide: lu, conf: 'low'};
    }
  const f = fuzzy(base);
  if (f) return f;
  return {lucide: CTX_DEFAULT[ctx] || 'square', conf: 'low'};
}

// ---- build chunks --------------------------------------------------------
rmSync(`${HERE}/build/icons/chunks`, {recursive: true, force: true});
rmSync(`${HERE}/build/icons/out`, {recursive: true, force: true});
mkdirSync(`${HERE}/build/icons/chunks`, {recursive: true});
mkdirSync(`${HERE}/build/icons/out`, {recursive: true});
writeFileSync(`${HERE}/build/icons/lucide-list.txt`, wl.lucide.join('\n'));

const CHUNK = 100;
const manifest = [];
const stats = {high: 0, med: 0, low: 0};
for (const ctx of Object.keys(wl.contexts)) {
  const names = wl.contexts[ctx];
  for (let i = 0; i < names.length; i += CHUNK) {
    const slice = names.slice(i, i + CHUNK).map(name => {
      const s = suggest(name, ctx);
      stats[s.conf]++;
      return {name, suggest: s.lucide, confidence: s.conf};
    });
    const id = `${ctx}-${i / CHUNK}`;
    writeFileSync(`${HERE}/build/icons/chunks/${id}.json`,
      JSON.stringify({context: ctx, icons: slice}, null, 1));
    manifest.push({id, context: ctx, count: slice.length});
  }
}
writeFileSync(`${HERE}/build/icons/manifest.json`, JSON.stringify(manifest, null, 1));
console.log('chunks:', manifest.length, 'confidence:', JSON.stringify(stats));
console.log(manifest.map(m => `${m.id}(${m.count})`).join(' '));
