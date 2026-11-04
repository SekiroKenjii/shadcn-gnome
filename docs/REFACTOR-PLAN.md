# Refactor plan: shadcn-gnome v2

This plan turned the v1 scripts (one theme builder, one icon generator, one
installer) into a project that owns every surface of the desktop: GTK, GNOME
Shell, the GDM login screen, icons and cursors, in both color schemes, with a
development environment that can show each of them without touching the
developer's own desktop.

The target look is the "shadcn-gnome · GNOME 51 theme" design canvas
(Foundations, Shell, GTK4/libadwaita, Icons & cursors, Light scheme).

## Goals

1. **One source of truth per concern.** Colors live in `themes/*.json`, shapes
   in `styles/`, icon and cursor tables in `assets/`. Code never hardcodes them.
2. **Light and dark from one build.** Every surface ships both schemes and
   follows the system's Dark Style switch at runtime.
3. **Complete coverage of the design.** Shell (panel, popovers, quick settings,
   calendar, notifications, OSD, switchers, dialogs, screenshot UI, overview,
   app grid, lock screen), GDM (password, web login, security key), libadwaita
   widgets, Lucide icons, an SVG cursor theme and wallpapers.
4. **Reversible installs.** Uninstall restores the user's previous settings, not
   GNOME defaults, and the GDM path keeps its validate-before-swap safety.
5. **Self-explanatory code.** Small modules with intention-revealing names,
   comments only where the *why* is not obvious from the code.
6. **Testable without a GNOME desktop.** Unit tests, a headless Shell capture,
   a greeter preview, and a VM for the parts that need root.

## Architecture decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Stylesheet language | SCSS (dart-sass) with a virtual `shadcn:tokens` module | Industry standard for GNOME themes; partials per widget; the build injects each theme's palette, so SCSS never contains colors. |
| GTK4 schemes | One `gtk.css` with `@media (prefers-color-scheme: dark)` and `--shadcn-*` custom properties | GTK binds the user stylesheet to the system color scheme, contrast and reduced-motion settings, as libadwaita itself does. |
| Shell delivery | Companion extension `shadcn-gnome@sekirokenjii.github.io` calling `Main.setThemeStylesheet()` per variant | User Themes only loads one `gnome-shell.css`; the extension swaps `theme-dark.css`/`theme-light.css` when Dark Style changes and stays enabled on the lock screen. |
| Shell specificity | All overrides scoped under `#uiGroup` | St orders rules by specificity before origin; the id beats the distro's nested selectors without `!important`, in the session and in the GDM gresource alike. |
| Icons per scheme | `Lucide` (symbolic + dark-scheme plain icons) and `Lucide-Light` (light-scheme plain icons, inherits `Lucide`) | Symbolic icons recolor themselves; full-color plain icons cannot, so the extension switches icon theme with the app color scheme. |
| Cursors | `cursors_scalable/` SVG + metadata on a 32-unit grid, plus Xcursor 24/32/48/64 encoded in JS | Crisp at any scale on GNOME 51, still works for X11 and older compositors; no `xcursorgen` dependency. |
| Build orchestration | Target registry (strategy pattern): `gtk`, `shell`, `gdm`, `terminal`, `firefox`, `wallpapers`, `icons`, `cursors` | Each surface is a self-contained module with `build(context)`; the CLI and installer select subsets. |
| Installer | Bash orchestrator + one component file per surface + a settings ledger | Each component exposes `targets/install/uninstall`; the ledger records the first value of every changed setting so uninstall restores it. |

## Phases

| # | Phase | Result |
| --- | --- | --- |
| 1 | Data | `themes/*.json` gained `schemes.dark/light` (design tokens, terminal base slots, optional dark panel) and a JSON Schema; shared ANSI colors, cursor spec and icon tables moved under `assets/`. |
| 2 | Build core | `src/core` (paths, color math, output, logging), `src/theme` (catalog + validation, palette resolution, design tokens), `src/styles` (sass with token injection). |
| 3 | Styles | `styles/gtk4`, `styles/gtk3`, `styles/shell`, `styles/gdm` partials implementing the Foundations, Shell, Lock/Login and libadwaita boards. |
| 4 | Targets | GTK, Shell extension, GDM fragments, Ptyxis, Firefox (scheme-aware), wallpapers, Lucide icons (stroke 1.5, GNOME 49–51 apps, folder-projects, emblem precedence), SVG cursors. |
| 5 | Installer | `installer/main.sh` + `installer/components/*.sh`, settings ledger, `--scheme`, `--cursor`, `--wallpaper`, `--all`, GDM helper with scheme-aware fragments and greeter-wide cursor/icon/font. |
| 6 | Dev environment | Nested sandbox, scene driver, app launcher, live reload, headless capture, greeter preview, Fedora toolbox image, QEMU VM for GDM. |
| 7 | Quality | `node:test` suites, Biome, ShellCheck, CI with lint/test/build, gresource validation and headless screenshots. |

All phases are implemented on this branch.

## Migration from v1

* `./install.sh` keeps its flags (`-t`, `-i`, `-f`, `--terminal`, `--gdm`,
  `--patch-vitals`, `--firefox`) and adds `--scheme`, `--cursor`,
  `--wallpaper`, `--dark-panel` and `--all`.
* The old `~/.themes/Shadcn-*` Shell themes are removed on install; if User
  Themes only served one of them it is disabled (and re-enabled by uninstall).
* `lib/` was split into `src/` (Node) and `installer/` (Bash);
  `scripts/patch-desktop-icons.sh` became part of the icons component;
  `lib/patch-vitals.mjs` became `shadcn-gnome vitals patch|restore`.
* `assets/mapping.json` → `assets/icons/mapping.json`,
  `assets/icon-overrides.json` → `assets/icons/overrides.json`,
  `assets/custom-icons/` → `assets/icons/custom/`.

## Verification status

| Surface | How it was verified |
| --- | --- |
| Build of all themes × targets | `npm run build`, 67 unit tests, contrast checks (every design pair passes AA in both schemes). |
| GNOME Shell (session) | Headless GNOME Shell 46 in a container: panel, quick settings, calendar, notifications, OSD, run dialog, screenshot UI, overview, app grid captured in both schemes. |
| GDM | Greeter gresource built and validated against Ubuntu's stock gresource (light/dark fragments, gdm-light/dark aliases, markers). The live login prompt needs GDM itself, so it is left to the VM. |
| Installer | Install and uninstall in a sandbox HOME: settings restored, foreign `gtk.css` and Firefox files restored. |
| Icons, cursors, wallpapers | Rendered contact sheet (`npm run preview`) and decoded Xcursor headers. |

Not verified here (needs real hardware or a newer stack): GTK 4.20+ media
queries in apps, GNOME 51 selectors on a real session, the lock screen
(needs a real modal grab), and the QEMU VM scripts (no KVM in CI). The
toolbox image and the VM exist for exactly these checks.

## Follow-ups

* Add a GTK capture scene (widget factory, adwaita demo) to the headless run
  once the CI image ships GTK ≥ 4.20.
* Pixel-diff the captured screens against approved baselines in CI.
* Package the Shell extension for extensions.gnome.org so updates do not need
  the installer.
