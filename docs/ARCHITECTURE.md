# Architecture

shadcn-gnome turns a few data files into every surface of a GNOME desktop and
installs them reversibly.

```text
themes/*.json ─┐
assets/**      ├─► src/ (Node build) ─► build/<theme>/ ─► installer/ (Bash) ─► ~/.config, ~/.local/share, /usr (GDM)
styles/**.scss ┘
```

## Repository layout

```text
themes/                 palettes: one JSON per theme, dark + light schemes, validated by schema.json
assets/
  fonts/                Geist and Geist Mono (variable TTF)
  icons/                mapping.json (freedesktop → Lucide), overrides.json, custom/ marks
  cursors/cursors.json  cursor shapes, hotspots, X11 aliases
  terminal/ansi.json    chromatic ANSI slots shared by every theme
styles/                 SCSS; never contains a color
  lib/                  token access (_tokens) and CSS-variable helpers (_variables)
  gtk4/ gtk3/           libadwaita / GTK3 partials
  shell/                GNOME Shell partials, scoped under #uiGroup
  gdm/                  greeter entry: Shell partials + distro-specific overrides
shell-extension/        extension.js of the companion Shell extension
src/                    build system (Node ESM, no framework)
  core/                 paths, color math, JSON, output directory, logger
  theme/                catalog + validation, palette resolution, design tokens
  styles/compile.mjs    dart-sass with the virtual `shadcn:tokens` module
  targets/              one build target per surface + registry
  commands/             CLI helpers (contrast report, Vitals patching)
  build.mjs             BuildContext + pipeline
bin/shadcn-gnome.mjs    CLI: build, themes, targets, contrast, field, vitals, desktop-overrides
installer/
  main.sh               flag parsing and orchestration
  lib/                  log, paths, platform (package managers), state (settings ledger)
  components/           gtk, shell, icons, cursors, fonts, wallpapers, terminal, firefox, vitals, gdm
  gdm-helper.sh         root helper: build, validate and activate the greeter gresource
dev/                    development environment (see DEVELOPMENT.md)
tests/                  node:test suites
scripts/                maintainer tasks (icon mapping pipeline, font refresh)
```

## Data model

A theme declares only the design tokens; everything else is derived.

```jsonc
{
  "id": "graphite", "label": "Shadcn Graphite", "radius": 6,
  "strokeJoin": "round", "wallpaper": "dots",
  "fonts": { "interface": "Geist 11", "document": "Geist 11", "monospace": "Geist Mono 11" },
  "schemes": {
    "dark":  { "colors": { "bg": "#1a1a1a", "...": "23 design tokens" }, "terminal": { "...": "base slots" } },
    "light": { "colors": { "...": "..." }, "terminal": { "...": "..." }, "darkPanel": { "panel": "#161616" } }
  }
}
```

`src/theme/palette.mjs` adds the derived tokens: foreground aliases, inverse
colors (tooltips, toasts), the divider on primary, scheme effects (shade,
scrim, wallpaper ink) and the panel tokens (light panel = card, optional dark
panel). `src/theme/tokens.mjs` derives the radius scale (sm ×0.67, lg ×1.34,
xl ×2, xxl ×2.67) and motion durations.

## Build pipeline

`createBuildContext(themeId)` loads and validates the theme, resolves both
palettes and the design tokens, and opens `build/<theme>/` as an
`OutputDirectory`. Every target implements the same small interface:

```js
export const exampleTarget = {
  id: 'example',
  description: 'what it produces',
  build(context) { /* write files through context.output */ return 'summary'; },
};
```

Targets are registered in `src/targets/registry.mjs`; the CLI builds all of
them or a `--target` subset, and the installer asks each component which
targets it needs.

| Target | Output | Notes |
| --- | --- | --- |
| `gtk` | `gtk-4.0/gtk.css`, `gtk-3.0/gtk-{dark,light}.css` | GTK4: `--shadcn-*` + libadwaita variables per scheme, widget rules read `var()`. |
| `shell` | `gnome-shell/<uuid>/` | Companion extension with `theme-dark.css` / `theme-light.css`. |
| `gdm` | `gdm/greeter-{dark,light}.css` | Shell partials + distro compat, appended into the gresource. |
| `terminal` | `ptyxis/<label>.palette` | `[Dark]` and `[Light]` sections. |
| `firefox` | `firefox/*` | Chrome variables per scheme, Lucide toolbar icons via `context-stroke`. |
| `wallpapers` | `backgrounds/shadcn-<pattern>-{dark,light}.svg` + background properties | Dots, grid or spotlight, per theme. |
| `icons` | `icons/Lucide`, `icons/Lucide-Light` | Stroke → filled-dot conversion for symbolic icons; plain icons baked per scheme. |
| `cursors` | `cursors/Shadcn`, `cursors/Shadcn-Dark` | SVG `cursors_scalable/` + Xcursor, aliases as symlinks. |

## Styles

`compileStylesheet(entry, tokens)` compiles one SCSS entry with an importer
that serves `shadcn:tokens`: the active `$palette`, both `$palettes`, the
radius scale, motion and fonts. Partials read tokens through
`styles/lib/_tokens.scss` (`color()`, `radius()`, `pt()`) or, for GTK4,
through `styles/lib/_variables.scss` (`token()` → `var(--shadcn-…)`).

GNOME Shell specifics:

* `Main.setThemeStylesheet()` loads our sheet above the distro default, but St
  still orders declarations by selector specificity, so every partial is loaded
  inside `#uiGroup { … }`. That one id outranks the distro's class chains on
  the desktop, the lock screen and the greeter.
* Font sizes are written in design pixels and converted with `pt()`, so text
  follows the text-scaling factor.

## Shell extension

`shell-extension/extension.js` does three things:

1. On enable, and whenever `St.Settings` reports a new color scheme, it loads
   `theme-<variant>.css` with `Main.setThemeStylesheet()`.
2. When `org.gnome.desktop.interface color-scheme` changes it switches the icon
   theme between `Lucide` and `Lucide-Light`, only if one of them is active.
3. It declares `session-modes: ["user", "unlock-dialog"]`, so the lock screen
   keeps the theme.

## Installer

`install.sh` and `uninstall.sh` exec `installer/main.sh`. Components are plain
Bash files with three functions:

```bash
component_icons_targets()   { echo icons; }
component_icons_install()   { …; apply_setting org.gnome.desktop.interface icon-theme "'Lucide'"; }
component_icons_uninstall() { …; }
```

`apply_setting` records the first value it replaces in
`~/.local/state/shadcn-gnome/settings.tsv`; uninstall replays that ledger.
Files the user owned before (`gtk.css`, Firefox chrome) are kept as
`*.shadcn-backup` and restored.

### GDM

`installer/gdm-helper.sh` runs as root and is the only code that touches
system files:

1. Extract the distro theme gresource into a temporary directory.
2. Append `greeter-light.css` to `*-light.css` stylesheets and
   `greeter-dark.css` to the others (high contrast is left alone); add
   `gdm-{dark,light}.css` aliases when missing.
3. Compile and **validate** (resource count, markers present) before anything
   live changes.
4. Activate through `update-alternatives` (Debian/Ubuntu) or a one-time backup
   (Fedora and others). GDM is never restarted.
5. Write `/etc/dconf/db/gdm.d/07-shadcn-gnome` (accent, color scheme, and the
   cursor/icon/font installed under `/usr/local/share` when selected), layering
   `system-db:gdm` into the profile without replacing it.

`gdm-helper.sh build --base … --out …` runs steps 1–3 without root; the dev
preview and CI use it.

## Extending

* **New theme**: add `themes/<id>.json` (the schema lists every required
  token), run `npm test` (validation and contrast) and `npm run build`.
* **New surface**: add a target in `src/targets/`, register it, add an
  installer component with `targets/install/uninstall`, and a test.
* **New Shell widget style**: add a partial in `styles/shell/` and load it in
  `gnome-shell.scss`; selectors are already scoped.
* **New icon remap**: edit `assets/icons/overrides.json` (`overrides`,
  `folderIcons`, `appBrands`, …); the mapping tests check that every target
  exists in Lucide.
