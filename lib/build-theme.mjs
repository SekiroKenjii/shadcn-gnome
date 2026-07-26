// build-theme.mjs: emit every shadcn theme surface from a theme resource.
// The palette is NOT in this file: it comes from themes/<name>.json (edit that
// to re-color, or add a new file for a new theme). Node ESM, no deps.
// Usage: node lib/build-theme.mjs [theme]   (default: graphite; or THEME=env)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadTheme, lucideDir, resolveThemeName, themeBuildDir } from './config.mjs';

const theme = loadTheme(resolveThemeName());
const d = theme.colors;
const RADIUS = theme.radius ?? 6;
const SHADE = d.shade ?? 'rgba(0,0,0,0.36)'; // drop shadow (from the theme)

const B = themeBuildDir(theme.name);
const out = (p, s) => {
  const full = `${B}/${p}`;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, s);
  console.log(`  wrote ${full} (${s.length}b)`);
};

// #rrggbb + alpha -> rgba(); used for shades derived from bg/fg.
function withAlpha(hex, a) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---- GTK4 / libadwaita -----------------------------------------------------
function gtk4(d) {
  const named = {
    window_bg_color: d.bg, window_fg_color: d.fg,
    view_bg_color: d.bg, view_fg_color: d.fg,
    headerbar_bg_color: d.headerbar, headerbar_fg_color: d.fg,
    headerbar_border_color: d.border, headerbar_backdrop_color: d.bg,
    headerbar_shade_color: SHADE,
    sidebar_bg_color: d.sidebar, sidebar_fg_color: d.fg,
    sidebar_backdrop_color: d.bg, sidebar_border_color: d.border,
    sidebar_shade_color: SHADE,
    secondary_sidebar_bg_color: d.secondarySidebar, secondary_sidebar_fg_color: d.fg,
    secondary_sidebar_backdrop_color: d.bg, secondary_sidebar_border_color: d.border,
    card_bg_color: d.card, card_fg_color: d.cardFg, card_shade_color: SHADE,
    dialog_bg_color: d.popover, dialog_fg_color: d.popoverFg,
    popover_bg_color: d.popover, popover_fg_color: d.popoverFg,
    popover_shade_color: SHADE,
    overview_bg_color: d.bg, overview_fg_color: d.fg,
    accent_bg_color: d.primary, accent_fg_color: d.primaryFg, accent_color: d.accentText,
    destructive_bg_color: d.destructive, destructive_fg_color: d.destructiveFg,
    destructive_color: d.destructiveTint,
    success_color: d.success, success_bg_color: d.success, success_fg_color: d.bg,
    warning_color: d.warning, warning_bg_color: d.warning, warning_fg_color: d.bg,
    error_color: d.destructiveTint, error_bg_color: d.destructive, error_fg_color: d.destructiveFg,
    borders: d.border, shade_color: SHADE,
    scrollbar_outline_color: 'rgba(0,0,0,0)',
  };
  const root = Object.entries(named)
    .map(([k, v]) => `  --${k.replaceAll('_', '-')}: ${v};`).join('\n');
  const define = Object.entries(named)
    .map(([k, v]) => `@define-color ${k} ${v};`).join('\n');
  return `/* ${theme.label}: GTK4 / libadwaita. Generated; edit themes/${theme.name}.json.
   Dark-first (the system runs color-scheme: prefer-dark). Apps read this at
   startup. Restart an app to apply. Delete the file to revert. */

:root {
${root}
  --border-color: ${d.border};
}

${define}

/* --- shadcn "outlined" widget shaping: ${RADIUS}px radius, thin 1px borders --- */
button:not(.flat):not(.image-button):not(.toggle),
entry, spinbutton, .entry,
.card, .boxed-list, .osd,
popover > contents, .background.popup,
.view.frame, frame > border {
  border-radius: ${RADIUS}px;
}

button:not(.flat):not(.image-button),
entry:not(.search):not(.flat), spinbutton {
  border: 1px solid ${d.border};
}
button:not(.flat):not(.image-button) {
  background-color: ${d.secondary};
}
button:not(.flat):not(.image-button):hover { background-color: ${d.hover}; }
button:not(.flat):not(.image-button):active,
button:not(.flat):not(.image-button):checked { background-color: ${d.activeSel}; }

entry:focus-within, spinbutton:focus-within {
  border-color: ${d.ring};
  box-shadow: 0 0 0 1px ${d.ring};
}

/* GTK4's css parser rejects :is()/:where() ("Unknown pseudoclass") and drops
   any declaration carrying !important ("Junk at end of value"), silently
   discarding such rules. Everything below therefore wins the plain way: placed
   after the raised rule above and carrying more specificity than its (0,2,1). */

/* AdwSplitButton in a header bar (the Files view switch). Node tree:
   splitbutton > button + separator + menubutton > button. Style the two halves
   as separate rounded pills with a real gap, like the neighboring header
   buttons, instead of libadwaita's joined halves with a seam. */
headerbar splitbutton {
  background-color: transparent;
  background-image: none;
  border: none;
  box-shadow: none;
}
headerbar splitbutton > separator {
  background-color: transparent;
  background-image: none;
  min-width: 0;
}
headerbar splitbutton > button:not(.suggested-action):not(.destructive-action),
headerbar splitbutton > menubutton > button:not(.suggested-action):not(.destructive-action) {
  background-color: ${d.secondary};
  border: none;
  box-shadow: none;
  border-radius: ${RADIUS}px;
}
headerbar splitbutton > button:not(.suggested-action):not(.destructive-action) {
  margin-right: 4px; /* replace the -1px joined overlap with a gap */
}

/* Column-view titles (Files list view) read as flat headers, not buttons. */
columnview > header > button:not(.suggested-action):not(.destructive-action) {
  background-color: transparent;
  border: none;
  box-shadow: none;
}

.card, .boxed-list {
  border: 1px solid ${d.border};
  background-color: ${d.card};
}
popover > contents, .background.popup {
  border: 1px solid ${d.border};
}

/* suggested (accent) buttons: shadcn primary */
button.suggested-action {
  background-color: ${d.primary};
  color: ${d.primaryFg};
  border: 1px solid ${d.primary};
}
button.destructive-action {
  background-color: ${d.destructive};
  color: ${d.destructiveFg};
}

/* selection rows / active states use the muted accent, not a saturated hue */
row.activatable:selected, row.activatable:active,
.view:selected, textview text selection, entry selection {
  background-color: ${d.accent};
  color: ${d.fg};
}
`;
}

// ---- GTK3 ------------------------------------------------------------------
function gtk3(d) {
  return `/* ${theme.label}: GTK3. Generated; dark-first. Restart apps to apply. */
@define-color theme_bg_color ${d.bg};
@define-color theme_fg_color ${d.fg};
@define-color theme_base_color ${d.card};
@define-color theme_text_color ${d.fg};
@define-color theme_selected_bg_color ${d.primary};
@define-color theme_selected_fg_color ${d.primaryFg};
@define-color theme_unfocused_bg_color ${d.bg};
@define-color theme_unfocused_fg_color ${d.fg};
@define-color theme_unfocused_base_color ${d.card};
@define-color theme_unfocused_selected_bg_color ${d.accent};
@define-color insensitive_bg_color ${d.bg};
@define-color borders ${d.border};
@define-color unfocused_borders ${d.border};
@define-color content_view_bg ${d.bg};
@define-color warning_color ${d.warning};
@define-color error_color ${d.destructive};
@define-color success_color ${d.success};

headerbar, .titlebar {
  background: ${d.headerbar};
  color: ${d.fg};
  border-bottom: 1px solid ${d.border};
}
button {
  border-radius: ${RADIUS}px;
  border: 1px solid ${d.border};
  background: ${d.secondary};
}
button:hover { background: ${d.hover}; }
button:active, button:checked { background: ${d.activeSel}; }
entry {
  border-radius: ${RADIUS}px;
  border: 1px solid ${d.border};
  background: ${d.card};
}
entry:focus { border-color: ${d.ring}; }
`;
}

// ---- GNOME Shell override (appended to a base theme's gnome-shell.css) -----
function shell(d) {
  const dimFg = (a) => withAlpha(d.fg, a);
  return `
/* ==================================================================
 * ${theme.label} overrides, appended after the base dark shell theme.
 * Neutral surfaces; accent is the muted gray primary. Radius ${RADIUS}px.
 * Generated from themes/${theme.name}.json.
 * ================================================================== */
/* Monochrome: neutralize the accent (checked toggles, the split menu-button
 * arrow, sliders, switches) so no Settings hue leaks through. */
stage { -st-accent-color: ${d.primary}; -st-accent-fg-color: ${d.primaryFg}; }

.popup-menu-content, .candidate-popup-content { background-color: ${d.card}; }
.datemenu-popover { background-color: ${d.card}; }
.quick-settings { background-color: ${d.card}; }
.quick-toggle, .quick-settings .icon-button, .quick-slider .icon-button {
  background-color: ${d.secondary}; color: ${d.fg}; }
.quick-toggle:hover, .quick-settings .icon-button:hover { background-color: ${d.hover}; }
.quick-toggle:focus, .quick-settings .icon-button:focus {
  background-color: ${d.hover}; box-shadow: none !important; }
.quick-toggle:checked, .quick-toggle:checked:hover, .quick-toggle:checked:focus,
.quick-toggle:checked:active {
  background-color: ${d.primary}; color: ${d.primaryFg}; box-shadow: none !important; }
/* split-toggle arrow: match Yaru's exact selectors so we win on specificity;
   body + arrow now share one fill, no accent tint */
.quick-toggle-has-menu .quick-toggle-menu-button {
  background-color: ${d.secondary}; color: ${d.fg}; }
.quick-toggle-has-menu .quick-toggle-menu-button:hover { background-color: ${d.hover}; }
.quick-toggle-has-menu .quick-toggle-menu-button:focus {
  background-color: ${d.hover}; box-shadow: none !important; }
.quick-toggle-has-menu .quick-toggle-menu-button:checked,
.quick-toggle-has-menu .quick-toggle-menu-button:checked:hover,
.quick-toggle-has-menu .quick-toggle-menu-button:checked:focus,
.quick-toggle-has-menu .quick-toggle-menu-button:checked:active {
  background-color: ${d.primary}; color: ${d.primaryFg}; box-shadow: none !important; }
/* one pill, split by a faint 1px divider (dark, reads on the gray fill) */
.quick-toggle-has-menu .quick-toggle-separator,
.quick-toggle-has-menu:checked .quick-toggle-separator {
  background-color: ${d.divider ?? 'rgba(0,0,0,0.22)'}; width: 1px; }
.quick-toggle-menu { background-color: ${d.popover}; }
.slider { -barlevel-active-background-color: ${d.primary}; }
.toggle-switch:checked { background-color: ${d.primary}; }

.datemenu-today-button, .events-button, .world-clocks-button, .weather-button,
.datemenu-today-button:insensitive, .events-button:insensitive,
.world-clocks-button:insensitive, .weather-button:insensitive {
  background-color: ${d.card}; color: ${d.fg}; }
.datemenu-today-button:hover, .events-button:hover, .world-clocks-button:hover, .weather-button:hover,
.datemenu-today-button:focus, .events-button:focus, .world-clocks-button:focus, .weather-button:focus {
  background-color: ${d.secondary}; color: ${d.fg}; }
.message { background-color: ${d.card}; }
.message:hover, .message:focus, .message:active { background-color: ${d.secondary}; }
.notification-banner { background-color: ${d.card}; }
.modal-dialog { background-color: ${d.card}; }
.osd-window { background-color: ${withAlpha(d.bg, 0.96)}; }

/* calendar: re-derive warm/cold cells to neutral surfaces */
.calendar { background-color: transparent; }
.calendar .calendar-day, .calendar .calendar-day:insensitive {
  background-color: ${d.card}; color: ${d.fg}; }
.calendar .calendar-day:hover, .calendar .calendar-day:focus { background-color: ${d.secondary}; }
.calendar .calendar-day:selected, .calendar .calendar-day:selected:hover {
  background-color: ${d.accent}; color: ${d.fg}; }
.calendar .calendar-day.calendar-other-month,
.calendar .calendar-day.calendar-other-month:insensitive {
  background-color: ${d.bg}; color: ${dimFg(0.4)}; }
.calendar .calendar-day-heading, .calendar .calendar-day-heading:insensitive {
  background-color: transparent; color: ${dimFg(0.5)}; }
.calendar .calendar-week-number, .calendar .calendar-week-number:insensitive {
  background-color: transparent; color: ${dimFg(0.5)}; }
.calendar .calendar-day.calendar-today,
.calendar .calendar-day.calendar-today:selected,
.calendar .calendar-day.calendar-today:focus,
.calendar .calendar-day.calendar-today:hover,
.calendar .calendar-day.calendar-today:active {
  background-color: ${d.primary}; color: ${d.primaryFg}; }
.calendar .calendar-month-header .calendar-month-label,
.calendar .calendar-month-header .calendar-month-label:insensitive {
  background-color: ${d.secondary}; color: ${d.fg}; }
.calendar .calendar-month-header .calendar-month-label:hover,
.calendar .calendar-month-header .calendar-month-label:focus {
  background-color: ${d.hover}; color: ${d.fg}; }
.message .message-header .message-close-button,
.message-notification-group .message-collapse-button,
.calendar .calendar-month-header .pager-button, .button {
  background-color: ${d.secondary}; color: ${d.fg}; }
.message .message-header .message-close-button:hover,
.message-notification-group .message-collapse-button:hover,
.calendar .calendar-month-header .pager-button:hover, .button:hover {
  background-color: ${d.hover}; }
`;
}

// ---- Ptyxis palette --------------------------------------------------------
function ptyxis(theme) {
  const block = (c) => `Background=${c.bg}
Foreground=${c.fg}
Cursor=${c.cursor}
Color0=${c.black}
Color1=${c.red}
Color2=${c.green}
Color3=${c.yellow}
Color4=${c.blue}
Color5=${c.magenta}
Color6=${c.cyan}
Color7=${c.white}
Color8=${c.brBlack}
Color9=${c.brRed}
Color10=${c.brGreen}
Color11=${c.brYellow}
Color12=${c.brBlue}
Color13=${c.brMagenta}
Color14=${c.brCyan}
Color15=${c.brWhite}`;
  return `[Palette]
Name=${theme.label}
Primary=true

[Dark]
${block(theme.terminal.dark)}

[Light]
${block(theme.terminal.light)}
`;
}

// ---- GDM greeter (login screen) fragment -----------------------------------
// Appended into the GNOME Shell theme gresource by lib/gdm-theme-setup.sh.
// Kept minimal + additive: neutral background, panel, accent, login entry and
// buttons. Bad CSS rules are ignored by the Shell parser, so this cannot break
// the greeter; the real risk (a malformed gresource) is handled in the helper.
function gdm(d) {
  // !important throughout: the base greeter stylesheet (Yaru on Ubuntu) has its
  // own high-specificity rules, and this fragment is appended after it, so we
  // force the palette to win regardless of selector specificity.
  return `
/* ${theme.label}: GDM greeter. Generated from themes/${theme.name}.json. */
#lockDialogGroup {
  background-color: ${d.bg} !important;
  background-image: none !important;
}
stage {
  -st-accent-color: ${d.primary} !important;
  -st-accent-fg-color: ${d.primaryFg} !important;
}

#panel, #panel:overview { background-color: ${d.headerbar} !important; }
#panel .panel-button, #panel .panel-button:hover { color: ${d.fg} !important; }

.login-dialog, .unlock-dialog {
  background-color: transparent !important;
  color: ${d.fg} !important;
  border: none !important;
}
.login-dialog-banner, .login-dialog-username, .login-dialog-user-list {
  color: ${d.fg} !important;
}
.login-dialog-user-list-item:selected, .login-dialog-user-list-item:focus,
.login-dialog-user-list-item:hover {
  background-color: ${d.accent} !important;
  color: ${d.fg} !important;
}

.login-dialog StEntry, .unlock-dialog StEntry, .modal-dialog StEntry {
  background-color: ${d.input} !important;
  color: ${d.fg} !important;
  border: 1px solid ${d.border} !important;
  border-radius: ${RADIUS}px !important;
  caret-color: ${d.fg} !important;
}
.login-dialog StEntry:focus, .unlock-dialog StEntry:focus, .modal-dialog StEntry:focus {
  border-color: ${d.ring} !important;
  box-shadow: 0 0 0 1px ${d.ring} !important;
}

.modal-dialog { background-color: ${d.card} !important; color: ${d.fg} !important; }
.login-dialog-button, .modal-dialog-button, .login-dialog-session-list-button,
.login-dialog .button, .unlock-dialog .button {
  background-color: ${d.secondary} !important;
  color: ${d.fg} !important;
  border: 1px solid ${d.border} !important;
  border-radius: ${RADIUS}px !important;
}
.login-dialog-button:hover, .modal-dialog-button:hover,
.login-dialog .button:hover { background-color: ${d.hover} !important; }
.login-dialog-button:active, .login-dialog-button:checked,
.modal-dialog-button:default { background-color: ${d.activeSel} !important; }

/* Yaru paints the focus ring on the user tile, the password field and the
   shutdown dialog with st-mix(-st-accent-color, ...), and those selectors carry
   more classes than the generic ones above, so !important alone loses. Repeat
   the base selectors verbatim to match their specificity. The accent is also
   neutralised at the source via dconf (see lib/gdm-theme-setup.sh), this is the
   fallback for setups where that setting does not apply. */
.login-dialog-user-list-view .login-dialog-user-list .login-dialog-user-list-item:selected,
.login-dialog-user-list-view .login-dialog-user-list .login-dialog-user-list-item:focus,
.login-dialog-user-list-view .login-dialog-user-list .login-dialog-user-list-item:active:focus {
  background-color: ${d.accent} !important;
  box-shadow: inset 0 0 0 2px ${d.ring} !important;
  color: ${d.fg} !important;
}
.login-dialog-user-list-view .login-dialog-user-list .login-dialog-user-list-item:selected:hover,
.login-dialog-user-list-view .login-dialog-user-list .login-dialog-user-list-item:focus:hover {
  background-color: ${d.hover} !important;
  box-shadow: inset 0 0 0 2px ${d.ring} !important;
}
.login-dialog-user-list-view .login-dialog-user-list .login-dialog-user-list-item .user-icon {
  border: 2px solid ${d.border} !important;
}
.login-dialog .login-dialog-prompt-entry:focus {
  background-color: ${d.input} !important;
  box-shadow: inset 0 0 0 1px ${d.ring} !important;
  color: ${d.fg} !important;
}
.login-dialog .login-dialog-prompt-entry {
  background-color: ${d.input} !important;
  color: ${d.fg} !important;
  border-radius: ${RADIUS}px !important;
}
.login-dialog .login-dialog-prompt-entry:hover {
  background-color: ${d.hover} !important;
}

/* Shutdown / restart / logout confirmation. */
.end-session-dialog {
  background-color: ${d.card} !important;
  color: ${d.fg} !important;
  border: 1px solid ${d.border} !important;
  border-radius: ${RADIUS}px !important;
}
.end-session-dialog .button, .end-session-dialog .modal-dialog-linked-button {
  background-color: ${d.secondary} !important;
  color: ${d.fg} !important;
  border: 1px solid ${d.border} !important;
}
.end-session-dialog .button:hover,
.end-session-dialog .modal-dialog-linked-button:hover {
  background-color: ${d.hover} !important;
}
.end-session-dialog .button:focus,
.end-session-dialog .modal-dialog-linked-button:focus,
.modal-dialog .button:focus, .modal-dialog-button:focus {
  box-shadow: inset 0 0 0 2px ${d.ring} !important;
  background-color: ${d.hover} !important;
}
.end-session-dialog .button:default,
.end-session-dialog .modal-dialog-linked-button:default {
  background-color: ${d.primary} !important;
  color: ${d.primaryFg} !important;
}
`;
}

// ---- Firefox chrome (userChrome / userContent / user.js) -------------------
// Recolours the browser toolbar, tabs, address bar and menus to the palette by
// setting Firefox's own theme variables (more stable than targeting widgets),
// with a few element rules for radius and hover. userContent stays minimal so
// about: pages keep Firefox's readable dark styling. user.js turns on custom
// stylesheets and forces the dark toolbar/content theme.
function firefoxChrome(d) {
  return `/* shadcn-gnome Firefox chrome (${theme.label}). Generated from themes/${theme.name}.json. */
:root {
  --sc-bg: ${d.bg};
  --sc-fg: ${d.fg};
  --sc-card: ${d.card};
  --sc-border: ${d.border};
  --sc-input: ${d.input};
  --sc-hover: ${d.hover};
  --sc-ring: ${d.ring};

  --lwt-accent-color: ${d.bg} !important;
  --lwt-text-color: ${d.fg} !important;
  --toolbar-bgcolor: ${d.bg} !important;
  --toolbar-color: ${d.fg} !important;
  --toolbarbutton-icon-fill: ${d.fg} !important;
  --tabs-border-color: ${d.border} !important;
  --lwt-toolbar-field-background-color: ${d.input} !important;
  --lwt-toolbar-field-color: ${d.fg} !important;
  --toolbar-field-background-color: ${d.input} !important;
  --toolbar-field-color: ${d.fg} !important;
  --toolbar-field-border-color: ${d.border} !important;
  --toolbar-field-focus-background-color: ${d.input} !important;
  --toolbar-field-focus-border-color: ${d.ring} !important;
  --tab-selected-bgcolor: ${d.card} !important;
  --tab-selected-textcolor: ${d.fg} !important;

  /* recolor Firefox's own toolbar-button hover so it keeps the native, snug
     geometry instead of an oversized box (do not override the element itself) */
  --toolbarbutton-hover-background: ${d.hover} !important;
  --toolbarbutton-active-background: ${d.activeSel} !important;
  --toolbarbutton-icon-fill-opacity: 1 !important;
}

#navigator-toolbox {
  background-color: ${d.bg} !important;
  border-bottom: 1px solid ${d.border} !important;
}
#TabsToolbar, #nav-bar, #PersonalToolbar { background-color: ${d.bg} !important; }

/* tabs: rounded on all four corners (pill), both horizontal and vertical tabs */
.tab-background { border-radius: ${RADIUS}px !important; }
.tab-background[selected] { background-color: ${d.card} !important; }
.tabbrowser-tab:hover .tab-background:not([selected]) { background-color: ${d.hover} !important; }

#urlbar, #searchbar {
  background-color: ${d.input} !important;
  color: ${d.fg} !important;
  border: 1px solid ${d.border} !important;
  border-radius: ${RADIUS}px !important;
}
#urlbar[focused="true"] {
  border-color: ${d.ring} !important;
  box-shadow: 0 0 0 1px ${d.ring} !important;
}

menupopup, panel {
  --panel-background: ${d.card} !important;
  --panel-color: ${d.fg} !important;
  --panel-border-color: ${d.border} !important;
}
menuitem:hover, menu:hover { background-color: ${d.hover} !important; }

#sidebar-box, #sidebar-header { background-color: ${d.bg} !important; color: ${d.fg} !important; }
`;
}
function firefoxContent(d) {
  return `/* shadcn-gnome Firefox content (${theme.label}). Kept small; Firefox's dark theme does the rest. */
@-moz-document url("about:blank"), url("about:newtab"), url("about:home") {
  body { background-color: ${d.bg} !important; }
}
`;
}
function firefoxPrefs() {
  return `// ${theme.label} Firefox prefs (written by shadcn-gnome).
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.theme.toolbar-theme", 0);
user_pref("browser.theme.content-theme", 0);
user_pref("layout.css.prefers-color-scheme.content-override", 0);
`;
}

// Replace Firefox's built-in toolbar icons with Lucide line icons, inlined as
// data URIs (self-contained, no external files) and baked to the theme fg.
// Reads lucide-static; returns "" if it is not installed so the colors still
// apply on their own.
function firefoxIcons(d) {
  let dir;
  try {
    dir = lucideDir();
  } catch {
    return '';
  }
  const map = {
    '#back-button': 'arrow-left',
    '#forward-button': 'arrow-right',
    '#reload-button': 'rotate-cw',
    '#stop-button': 'x',
    '#home-button': 'house',
    '#new-tab-button': 'plus',
    '#tabs-newtab-button': 'plus',
    '#alltabs-button': 'chevron-down',
    '#downloads-button': 'download',
    // note: no #fxa-toolbar-menu-button; leave the account button so a signed-in
    // profile keeps its own avatar instead of a generic user glyph.
    '#library-button': 'library',
    '#sidebar-button': 'panel-left',
    '#PanelUI-menu-button': 'menu',
    '#history-panelmenu': 'history',
    '#unified-extensions-button': 'puzzle',
    '#nav-bar-overflow-button': 'chevrons-right',
  };
  const rules = [];
  for (const [sel, name] of Object.entries(map)) {
    let svg;
    try {
      svg = readFileSync(`${dir}/${name}.svg`, 'utf8');
    } catch {
      continue;
    }
    svg = svg
      .replace(/<!--[\s\S]*?-->/g, '') // drop the license comment
      .replace(/\sclass="[^"]*"/g, '')
      .replaceAll('stroke="currentColor"', `stroke="${d.fg}"`)
      .replace(/\swidth="24"/, ' width="16"')
      .replace(/\sheight="24"/, ' height="16"')
      .replace(/\s+/g, ' ') // collapse newlines to keep the data URI compact
      .trim();
    const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    rules.push(
      `${sel}, ${sel} > .toolbarbutton-icon, ${sel} > .toolbarbutton-badge-stack > .toolbarbutton-icon {\n  list-style-image: url("${uri}") !important;\n}`,
    );
  }
  return rules.length
    ? `\n/* Lucide toolbar icons (baked to the theme foreground) */\n${rules.join('\n')}\n`
    : '';
}

console.log(`Generating ${theme.label} theme (radius ${RADIUS}px):`);
out('gtk-4.0/gtk.css', gtk4(d));
out('gtk-3.0/gtk.css', gtk3(d));
out('shell/gnome-shell.css', shell(d));
// The greeter fragment carries the FULL shell override plus the login-specific
// rules: the greeter renders quick settings, popovers and the calendar too, and
// with only the login rules those surfaces kept the stock look (orange accent
// included), which read as "theme not applied".
out('gdm/gnome-shell-gdm.css', shell(d) + gdm(d));
out(`ptyxis/${theme.label}.palette`, ptyxis(theme));
out('firefox/userChrome.css', firefoxChrome(d) + firefoxIcons(d));
out('firefox/userContent.css', firefoxContent(d));
out('firefox/user.js', firefoxPrefs());
console.log('done.');
