# shadcn-gnome

**A shadcn-style desktop for GNOME**: three neutral palettes (**Graphite**,
**Mono**, **Vercel**), each in a **dark and a light scheme**, applied to GTK4 /
libadwaita, GTK3, GNOME Shell and the **GDM login screen**, with a complete
**Lucide icon theme**, an **SVG cursor theme**, wallpapers, the **Geist**
typeface and matching Ptyxis and Firefox palettes.

Thin 1px borders, per-theme corner radius, monochrome line icons, a neutral
accent. Dark-first, light-ready: everything follows GNOME's Dark Style switch.

## Requirements

- **GNOME 47+** (designed for GNOME 51) on **Debian / Ubuntu** or **Fedora**.
- `node` ≥ 18 and `npm` to build; the installer installs what is missing
  (`gsettings`, `dconf`, `fontconfig`, `gtk-update-icon-cache`, and the glib
  tools for `--gdm`) through `apt` or `dnf`.

## Install

```sh
./install.sh                              # Graphite: GTK + GNOME Shell
./install.sh -t vercel --all              # + icons, cursors, fonts, wallpaper, terminal
./install.sh -t mono --scheme light --all --gdm --firefox
```

| Flag | | What it does |
| --- | --- | --- |
| `-t`, `--theme NAME` | | `graphite` (default), `mono`, `vercel`, or any file in `themes/` |
| `-s`, `--scheme SCHEME` | | `dark` (default) or `light`: the starting color scheme |
| `--dark-panel` | | keep the top bar dark in the light scheme |
| `-a`, `--all` | opt-in | icons, cursors, fonts, wallpaper and terminal |
| `-i`, `--icon` | opt-in | Lucide icon theme (`Lucide` / `Lucide-Light`) |
| `-c`, `--cursor[=dark]` | opt-in | SVG cursor theme `Shadcn` (light fill) or `Shadcn-Dark` |
| `-f`, `--font` | opt-in | Geist UI font and Geist Mono |
| `-w`, `--wallpaper` | opt-in | theme wallpaper, light and dark |
| `--terminal` | opt-in | Ptyxis palette |
| `--firefox` | opt-in | Firefox chrome following the system scheme |
| `--patch-vitals` | opt-in | recolor the Vitals extension's own icons |
| `--gdm` | opt-in | login screen (sudo, fully reversible); also uses the selected cursors, icons and font |

GTK and the GNOME Shell theme are always installed. **Log out and back in
once** so GNOME Shell loads the theme extension; after that the Dark Style
toggle switches Shell, GTK apps and icons together.

`./uninstall.sh` removes every installed file, reverts the login screen, and
restores each setting it changed to **your previous value**.

## Themes

| Theme | Radius | Wallpaper | Look |
| --- | --- | --- | --- |
| **Graphite** (default) | 6px | dot grid | neutral graphite greys, the classic shadcn desktop |
| **Mono** | 0px | line grid | pure monochrome, square corners, mitered cursors |
| **Vercel** | 8px | spotlight grid | pure black (or white) canvas, the Geist look |

Every color pair the design checks (text on window, captions on cards, primary
labels, selected rows, panel text) passes WCAG AA in both schemes:
`npm run contrast -- -t <theme>`.

## What it installs

| Surface | Where | How |
| --- | --- | --- |
| GTK4 / libadwaita | `~/.config/gtk-4.0/gtk.css` | one stylesheet, `@media (prefers-color-scheme)`, outlined widgets |
| GTK3 | `~/.config/gtk-3.0/gtk.css` | the scheme chosen at install |
| GNOME Shell | `~/.local/share/gnome-shell/extensions/shadcn-gnome@sekirokenjii.github.io` | companion extension: loads the light or dark stylesheet, keeps the lock screen themed |
| Login screen *(`--gdm`)* | GNOME Shell theme gresource + `/etc/dconf/db/gdm.d/07-shadcn-gnome` | validated before it goes live; reversible |
| Icons *(`-i`)* | `~/.local/share/icons/Lucide`, `Lucide-Light` | ~1660 freedesktop names, recognizable app marks, distinctive folders |
| Cursors *(`-c`)* | `~/.local/share/icons/Shadcn`, `Shadcn-Dark` | SVG `cursors_scalable` + Xcursor 24/32/48/64, full CSS and X11 name set |
| Wallpaper *(`-w`)* | `~/.local/share/backgrounds/shadcn-gnome` | SVG, light and dark |
| Fonts *(`-f`)* | `~/.local/share/fonts/geist` | Geist 11 for UI, Geist Mono 11 for code |
| Terminal *(`--terminal`)* | Ptyxis palettes | `[Dark]` and `[Light]` |
| Firefox *(`--firefox`)* | each profile's `chrome/` and `user.js` | follows the system scheme |

## Customize

- **Colors**: edit `themes/<name>.json` (validated by `themes/schema.json`)
  and re-run `./install.sh -t <name>`.
- **A new theme**: copy a theme file, change `id`, `label` and the tokens.
- **Icons**: `assets/icons/overrides.json` (app brands, folders, remaps) or an
  SVG in `assets/icons/custom/`.
- **Widget shapes**: SCSS partials in `styles/`.

## For developers

```sh
npm ci && npm test && npm run build
dev/sandbox.sh -t graphite             # GNOME Shell in a window, theme installed in a throwaway HOME
dev/headless/capture.sh -t vercel      # screenshots of every Shell surface, both schemes
dev/gdm-preview.sh --scheme light      # the themed login screen, no root needed
```

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layout, build pipeline, Shell and GDM delivery.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): toolbox, sandbox, headless capture, GDM preview and VM.
- [docs/REFACTOR-PLAN.md](docs/REFACTOR-PLAN.md): the v2 refactor plan and its verification status.

## Disclaimer

**Use this at your own risk.** The software is provided "as is", without
warranty of any kind, express or implied. The authors and contributors are not
liable for any claim, damage, data loss, or other liability arising from its
use. See [LICENSE](LICENSE) for the full terms.

Read this before running the installer:

- **It changes your desktop configuration.** The installer writes to
  `~/.config/gtk-3.0` and `~/.config/gtk-4.0`, `~/.local/share` (icons, cursors,
  fonts, backgrounds, a Shell extension), and changes GNOME settings through `gsettings` and
  `dconf`. An existing `gtk.css` you wrote yourself is kept as
  `gtk.css.shadcn-backup` and put back by uninstall, but a dotfiles or stow
  setup is still worth backing up first.
- **`--gdm` needs root and touches system files.** It rebuilds the GNOME Shell
  theme gresource that the login screen reads, and adds one dconf keyfile for
  the greeter. It is written defensively (build and validate in a tempdir, swap
  only on success, `update-alternatives` where available, backup elsewhere,
  never replace the dconf profile), but **a broken greeter can leave you unable
  to log in graphically**. Before using it the first time, know how to reach a
  TTY (`Ctrl+Alt+F3`) and run `./uninstall.sh` from there. Try it in the VM from
  `dev/vm/` first if you are not comfortable with that.
- **`--firefox` writes into your Firefox profiles.** An existing
  `userChrome.css` is backed up once as `userChrome.css.shadcn-backup`, and the
  prefs go into a marked block in `user.js`. Firefox chrome CSS is unofficial
  and can break after a Firefox update; if the browser looks wrong after an
  upgrade, remove the two files under `chrome/` in your profile.
- **`--patch-vitals` edits an extension's files in place.** The originals are
  backed up inside the extension folder and restored on uninstall, but updating
  the extension replaces them anyway; just re-run the flag afterwards.
- **Theme rendering depends on your GNOME version and distro.** The theme
  targets GNOME 47–51 (light/dark switching needs 47+). Other versions may shift
  selectors, so parts of the theme can look different or not apply at all.

`./uninstall.sh` reverses everything this project installs and restores the
settings it changed to the values you had before.

## Credits & licenses

- Palettes: the *Graphite*, *Mono*, and *Vercel* presets from
  [tweakcn](https://tweakcn.com) / shadcn.
- Icons: [Lucide](https://lucide.dev) (ISC) + [Tabler Icons](https://tabler.io/icons) (MIT).
- Font: [Geist](https://vercel.com/font) (OFL).
- Cursors: drawn for this project from Lucide glyphs (ISC).
- This project's own code: MIT.

This project is not affiliated with, endorsed by, or sponsored by GNOME,
Canonical, Vercel, shadcn, Lucide, Tabler, or Mozilla. All trademarks belong to
their respective owners.
