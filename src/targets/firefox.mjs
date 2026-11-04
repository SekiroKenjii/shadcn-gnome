import { existsSync, readFileSync } from 'node:fs';
import { paths } from '../core/paths.mjs';
import { SCHEMES } from '../theme/catalog.mjs';

const TOOLBAR_ICONS = Object.freeze({
  '#back-button': 'arrow-left',
  '#forward-button': 'arrow-right',
  '#reload-button': 'rotate-cw',
  '#stop-button': 'x',
  '#home-button': 'house',
  '#new-tab-button': 'plus',
  '#tabs-newtab-button': 'plus',
  '#alltabs-button': 'chevron-down',
  '#downloads-button': 'download',
  '#library-button': 'library',
  '#sidebar-button': 'panel-left',
  '#PanelUI-menu-button': 'menu',
  '#history-panelmenu': 'history',
  '#unified-extensions-button': 'puzzle',
  '#nav-bar-overflow-button': 'chevrons-right',
});

export const MARKER = 'shadcn-gnome';

export const firefoxTarget = {
  id: 'firefox',
  description: 'Firefox userChrome/userContent following the system color scheme',
  build(context) {
    const { output, palettes, tokens, theme } = context;
    const header = `/* ${MARKER} · ${theme.label}. Generated; do not edit. */\n`;
    const schemeBlocks = SCHEMES.map((scheme) => {
      const variables = chromeVariables(palettes[scheme]);
      return scheme === 'light' ? `:root {\n${variables}\n}` : `@media (prefers-color-scheme: dark) {\n  :root {\n${variables}\n  }\n}`;
    });
    output.write('firefox/userChrome.css', header + [...schemeBlocks, chromeRules(tokens.radius), toolbarIcons()].join('\n\n'));
    output.write(
      'firefox/userContent.css',
      `${header}@-moz-document url("about:blank"), url("about:newtab"), url("about:home") {\n  body { background-color: var(--sc-bg, Canvas) !important; }\n}\n`,
    );
    output.write('firefox/user.js', userPreferences());
    return 'firefox/{userChrome.css,userContent.css,user.js}';
  },
};

function chromeVariables(c) {
  const variables = {
    '--sc-bg': c.bg,
    '--sc-fg': c.fg,
    '--sc-card': c.card,
    '--sc-border': c.border,
    '--sc-input': c.input,
    '--sc-hover': c.hover,
    '--sc-active': c.activeSel,
    '--sc-ring': c.ring,
    '--lwt-accent-color': c.bg,
    '--lwt-text-color': c.fg,
    '--toolbar-bgcolor': c.bg,
    '--toolbar-color': c.fg,
    '--toolbarbutton-icon-fill': c.fg,
    '--tabs-border-color': c.border,
    '--toolbar-field-background-color': c.input,
    '--toolbar-field-color': c.fg,
    '--toolbar-field-border-color': c.border,
    '--toolbar-field-focus-background-color': c.input,
    '--toolbar-field-focus-border-color': c.ring,
    '--tab-selected-bgcolor': c.card,
    '--tab-selected-textcolor': c.fg,
    '--toolbarbutton-hover-background': c.hover,
    '--toolbarbutton-active-background': c.activeSel,
    '--panel-background': c.popover,
    '--panel-color': c.fg,
    '--panel-border-color': c.border,
    '--arrowpanel-background': c.popover,
    '--arrowpanel-color': c.fg,
    '--arrowpanel-border-color': c.border,
  };
  return Object.entries(variables)
    .map(([name, value]) => `    ${name}: ${value} !important;`)
    .join('\n');
}

function chromeRules(radius) {
  return `#navigator-toolbox {
  background-color: var(--sc-bg) !important;
  border-bottom: 1px solid var(--sc-border) !important;
}
#TabsToolbar, #nav-bar, #PersonalToolbar { background-color: var(--sc-bg) !important; }
.tab-background { border-radius: ${radius.md}px !important; }
.tab-background[selected] { background-color: var(--sc-card) !important; box-shadow: 0 0 0 1px var(--sc-border) !important; }
.tabbrowser-tab:hover .tab-background:not([selected]) { background-color: var(--sc-hover) !important; }
#urlbar-background, #searchbar {
  background-color: var(--sc-input) !important;
  border: 1px solid var(--sc-border) !important;
  border-radius: ${radius.md}px !important;
}
#urlbar[focused] > #urlbar-background {
  border-color: var(--sc-ring) !important;
  box-shadow: 0 0 0 1px var(--sc-ring) !important;
}
menupopup, panel { --panel-border-radius: ${radius.lg}px !important; }
menuitem:hover, menu:hover { background-color: var(--sc-hover) !important; }
#sidebar-box, #sidebar-header { background-color: var(--sc-bg) !important; color: var(--sc-fg) !important; }`;
}

function toolbarIcons() {
  if (!existsSync(paths.lucideIcons)) return '';
  return Object.entries(TOOLBAR_ICONS)
    .map(([selector, icon]) => {
      const uri = `data:image/svg+xml,${encodeURIComponent(contextStrokeSvg(icon))}`;
      return `${selector}, ${selector} > .toolbarbutton-icon, ${selector} > .toolbarbutton-badge-stack > .toolbarbutton-icon {\n  list-style-image: url("${uri}") !important;\n  -moz-context-properties: stroke;\n  stroke: var(--toolbarbutton-icon-fill) !important;\n}`;
    })
    .join('\n');
}

function contextStrokeSvg(icon) {
  return readFileSync(`${paths.lucideIcons}/${icon}.svg`, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sclass="[^"]*"/g, '')
    .replaceAll('stroke="currentColor"', 'stroke="context-stroke"')
    .replace(/\swidth="24"/, ' width="16"')
    .replace(/\sheight="24"/, ' height="16"')
    .replaceAll('stroke-width="2"', 'stroke-width="1.5"')
    .replace(/\s+/g, ' ')
    .trim();
}

function userPreferences() {
  return [
    'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);',
    'user_pref("browser.theme.toolbar-theme", 2);',
    'user_pref("browser.theme.content-theme", 2);',
    'user_pref("layout.css.prefers-color-scheme.content-override", 2);',
    '',
  ].join('\n');
}
