// build-theme.mjs — emit every shadcn-Graphite theme surface from one palette.
// Node ESM, no deps. Outputs into ./build/.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- Graphite palette (from tweakcn/shadcn) --------------------------------
const dark = {
    bg: '#1a1a1a', fg: '#d9d9d9',
    card: '#202020', cardFg: '#d9d9d9',
    popover: '#202020', popoverFg: '#d9d9d9',
    primary: '#a0a0a0', primaryFg: '#1a1a1a',
    secondary: '#303030', secondaryFg: '#d9d9d9',
    muted: '#2a2a2a', mutedFg: '#808080',
    accent: '#404040', accentFg: '#d9d9d9',
    destructive: '#e06666', destructiveFg: '#ffffff',
    border: '#353535', input: '#303030', ring: '#a0a0a0',
    sidebar: '#1f1f1f', sidebarFg: '#d9d9d9', sidebarBorder: '#353535',
    // derived
    headerbar: '#1f1f1f', hover: '#2c2c2c', activeSel: '#454545',
    accentText: '#c8c8c8',
};
const RADIUS = 6; // 0.35rem

const B = `${HERE}/build`;
const out = (p, s) => {
    const full = `${B}/${p}`;
    mkdirSync(dirname(full), {recursive: true});
    writeFileSync(full, s);
    console.log(`  wrote ${full} (${s.length}b)`);
};

// ---- GTK4 / libadwaita -----------------------------------------------------
function gtk4(d) {
    const named = {
        window_bg_color: d.bg, window_fg_color: d.fg,
        view_bg_color: d.bg, view_fg_color: d.fg,
        headerbar_bg_color: d.headerbar, headerbar_fg_color: d.fg,
        headerbar_border_color: d.border, headerbar_backdrop_color: d.bg,
        headerbar_shade_color: 'rgba(0,0,0,0.36)',
        sidebar_bg_color: d.sidebar, sidebar_fg_color: d.fg,
        sidebar_backdrop_color: d.bg, sidebar_border_color: d.border,
        sidebar_shade_color: 'rgba(0,0,0,0.36)',
        secondary_sidebar_bg_color: '#1d1d1d', secondary_sidebar_fg_color: d.fg,
        secondary_sidebar_backdrop_color: d.bg, secondary_sidebar_border_color: d.border,
        card_bg_color: d.card, card_fg_color: d.cardFg, card_shade_color: 'rgba(0,0,0,0.36)',
        dialog_bg_color: d.popover, dialog_fg_color: d.popoverFg,
        popover_bg_color: d.popover, popover_fg_color: d.popoverFg,
        popover_shade_color: 'rgba(0,0,0,0.36)',
        overview_bg_color: d.bg, overview_fg_color: d.fg,
        accent_bg_color: d.primary, accent_fg_color: d.primaryFg, accent_color: d.accentText,
        destructive_bg_color: d.destructive, destructive_fg_color: d.destructiveFg,
        destructive_color: '#e88a8a',
        success_color: '#7e9ca0', success_bg_color: '#7e9ca0', success_fg_color: d.bg,
        warning_color: '#d9b48a', warning_bg_color: '#d9b48a', warning_fg_color: d.bg,
        error_color: '#e88a8a', error_bg_color: d.destructive, error_fg_color: d.destructiveFg,
        borders: d.border, shade_color: 'rgba(0,0,0,0.36)',
        scrollbar_outline_color: 'rgba(0,0,0,0)',
    };
    const root = Object.entries(named)
        .map(([k, v]) => `  --${k.replace(/_/g, '-')}: ${v};`).join('\n');
    const define = Object.entries(named)
        .map(([k, v]) => `@define-color ${k} ${v};`).join('\n');
    return `/* Shadcn Graphite — GTK4 / libadwaita. Generated; edit build-theme.mjs.
   Dark-first (the system runs color-scheme: prefer-dark). Apps read this at
   startup — restart an app to apply. Delete the file to revert. */

:root {
${root}
  --border-color: ${d.border};
}

${define}

/* --- shadcn "outlined" widget shaping: 6px radius, thin 1px borders ------ */
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

.card, .boxed-list {
  border: 1px solid ${d.border};
  background-color: ${d.card};
}
popover > contents, .background.popup {
  border: 1px solid ${d.border};
}

/* suggested (accent) buttons: shadcn primary = light gray on dark text */
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
    return `/* Shadcn Graphite — GTK3. Generated; dark-first. Restart apps to apply. */
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
@define-color warning_color #d9b48a;
@define-color error_color ${d.destructive};
@define-color success_color #7e9ca0;

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
    return `
/* ==================================================================
 * Shadcn Graphite overrides — appended after the base (Yaru-dark).
 * Neutral graphite surfaces; accent is the muted gray primary.
 * Palette: ${d.bg} bg, ${d.card} raised, ${d.secondary}/${d.accent} tiles,
 *          ${d.fg} text, ${d.primary} accent. Radius ${RADIUS}px.
 * ================================================================== */
.popup-menu-content, .candidate-popup-content { background-color: ${d.card}; }
.datemenu-popover { background-color: ${d.card}; }
.quick-settings { background-color: ${d.card}; }
.quick-toggle, .quick-settings .icon-button { background-color: ${d.secondary}; }
.quick-toggle:hover, .quick-settings .icon-button:hover { background-color: ${d.hover}; }
.quick-toggle:focus, .quick-settings .icon-button:focus { background-color: ${d.hover}; }
.quick-toggle:checked, .quick-toggle:checked:hover, .quick-toggle:checked:focus {
  background-color: ${d.primary}; color: ${d.primaryFg}; }
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
.osd-window { background-color: rgba(26,26,26,0.96); }

/* calendar — re-derive warm/cold cells to graphite neutrals */
.calendar { background-color: transparent; }
.calendar .calendar-day, .calendar .calendar-day:insensitive {
  background-color: ${d.card}; color: ${d.fg}; }
.calendar .calendar-day:hover, .calendar .calendar-day:focus { background-color: ${d.secondary}; }
.calendar .calendar-day:selected, .calendar .calendar-day:selected:hover {
  background-color: ${d.accent}; color: ${d.fg}; }
.calendar .calendar-day.calendar-other-month,
.calendar .calendar-day.calendar-other-month:insensitive {
  background-color: ${d.bg}; color: rgba(217,217,217,0.4); }
.calendar .calendar-day-heading, .calendar .calendar-day-heading:insensitive {
  background-color: transparent; color: rgba(217,217,217,0.5); }
.calendar .calendar-week-number, .calendar .calendar-week-number:insensitive {
  background-color: transparent; color: rgba(217,217,217,0.5); }
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
function ptyxis(d) {
    // Muted-but-legible ANSI tuned to graphite. Grays for black/white,
    // desaturated hues so terminal output stays readable.
    const c = {
        bg: d.bg, fg: d.fg, cursor: d.primary,
        black: '#1a1a1a', red: '#e06666', green: '#a3be8c', yellow: '#d9b48a',
        blue: '#7e9ca0', magenta: '#b294bb', cyan: '#8fb0b0', white: '#d9d9d9',
        brBlack: '#5a5a5a', brRed: '#eb8f8f', brGreen: '#bfd3ab', brYellow: '#e6cbaa',
        brBlue: '#a0bcc0', brMagenta: '#ccb3d0', brCyan: '#aecccc', brWhite: '#f0f0f0',
    };
    return `[Palette]
Name=Shadcn Graphite
Primary=true

[Dark]
Background=${c.bg}
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
Color15=${c.brWhite}

[Light]
Background=#f0f0f0
Foreground=#333333
Cursor=#606060
Color0=#333333
Color1=#cc3333
Color2=#4c7a34
Color3=#a67c25
Color4=#476666
Color5=#7a5c8a
Color6=#3f7373
Color7=#f5f5f5
Color8=#666666
Color9=#d95c5c
Color10=#5f9147
Color11=#c29a4a
Color12=#5d8383
Color13=#93739f
Color14=#5a8f8f
Color15=#ffffff
`;
}

console.log('Generating shadcn-graphite theme:');
out('gtk-4.0/gtk.css', gtk4(dark));
out('gtk-3.0/gtk.css', gtk3(dark));
out('shell/shadcn-graphite-shell.css', shell(dark));
out('ptyxis/Shadcn Graphite.palette', ptyxis(dark));
console.log('done.');
