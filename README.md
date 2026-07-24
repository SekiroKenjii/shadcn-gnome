# shadcn-gnome

**shadcn-style desktop themes for GNOME**: three neutral shadcn palettes
(**Graphite**, **Mono**, **Vercel**), a **complete Lucide icon set** (~1660
names), the **Geist** typeface, and a matching **Ptyxis** terminal palette.

One command themes GTK4/libadwaita + GTK3 apps and the GNOME Shell (panel, quick
settings, calendar, notifications). Icons, terminal, and font are opt-in flags.

Thin 1px borders, per-theme corner radius, monochrome Lucide line icons: the
shadcn look, on the desktop. Dark-first.

## Requirements

- **GNOME 50+** on **Debian / Ubuntu** or **Fedora**.
- The installer **auto-resolves dependencies** (`node`, `npm`, `gsettings`,
  `dconf`, and, for the optional surfaces, `fontconfig`,
  `gtk-update-icon-cache`) via `apt`/`dnf`. The GNOME Shell theme uses the
  **User Themes** extension (installed/enabled automatically when possible).

## Install

```sh
./install.sh                       # Graphite theme (GTK + Shell) only
./install.sh -t vercel -i -f       # Vercel theme + Lucide icons + Geist font
./install.sh --theme mono --icon --terminal --font --gdm   # everything, Mono
```

| Flag | | What it does |
| ---- | --- | --- |
| `-t`, `--theme <name>` | | `graphite` (default), `mono`, or `vercel` |
| `-i`, `--icon` | opt-in | generate + apply the Lucide icon set for the theme |
| `--terminal` | opt-in | install + apply the Ptyxis terminal palette |
| `-f`, `--font` | opt-in | install + apply the Geist font |
| `--gdm` | opt-in | theme the GDM **login screen** (needs `sudo`; fully reversible) |
| `--patch-vitals` | opt-in | recolour the Vitals extension's bundled icons to match |
| `--firefox` | opt-in | apply the theme to the Firefox browser chrome |

The theme itself (GTK4/GTK3 + GNOME Shell) is **always** applied; the three
opt-in flags add the icon set, terminal palette, and font only when passed.

Then **log out and back in** for the Shell theme and icon theme to apply
everywhere (GTK apps and the terminal update on their next launch).

`./uninstall.sh` reverts every setting and removes all installed files
(any `Shadcn-*` Shell theme, the Lucide icons, Geist fonts, GTK css, and the
Ptyxis palettes), restores the Vitals icons, and drops the `.desktop` overrides.

## Themes

| Theme | Radius | Look |
| ----- | ------ | ---- |
| **Graphite** (default) | 6px | neutral graphite grays, the classic shadcn desktop |
| **Mono** | 0px | pure neutral monochrome, sharp corners |
| **Vercel** | 8px | pure black canvas, white primary, the Geist look |

All three are dark-first and monochrome; the accent is left neutral so no
Settings hue leaks through.

## What it does

| Surface | How |
| ------- | --- |
| GTK4 / libadwaita | `~/.config/gtk-4.0/gtk.css`: shadcn named colors + outlined widgets |
| GTK3 | `~/.config/gtk-3.0/gtk.css` |
| GNOME Shell | `~/.themes/Shadcn-NAME/` (a base dark theme + a neutral override) via User Themes |
| Icons *(`-i`)* | `~/.local/share/icons/Lucide`, a freedesktop theme covering ~1660 names |
| Terminal *(`--terminal`)* | a "Shadcn NAME" Ptyxis palette |
| Font *(`-f`)* | Geist Sans (UI) + Geist Mono, to `~/.local/share/fonts` |
| GDM login *(`--gdm`)* | rebuilds the GNOME Shell theme gresource with the palette (see safety notes) |
| Vitals *(`--patch-vitals`)* | recolours the Vitals extension's own bundled icons to Lucide |
| Firefox *(`--firefox`)* | `userChrome.css` + `userContent.css` + a `user.js` block, per profile |

### GDM login screen (`--gdm`): how it stays safe

Theming GDM means changing a **system** file that the login screen reads, so a
mistake could stop graphical login. This is handled by `lib/gdm-theme-setup.sh`
(run via `sudo`) with several guards:

- The new gresource is **built and validated in a tempdir** (resource count must
  match the original and our marker must be present); the live file is swapped
  **only after validation passes**; on any error it aborts and changes nothing.
- On **Debian/Ubuntu**, GDM's theme is managed by `update-alternatives`, so we
  register ours as a high-priority alternative. Removing it makes the OS
  **auto-revert** to the distro theme. Inherently reversible.
- On **Fedora/other**, the stock `gnome-shell-theme.gresource` is **backed up
  once** before replacing; uninstall restores it.
- We **never restart GDM** and **never touch the GDM dconf profile** (wiping it
  drops the greeter's session-name and breaks login, a known footgun).

The change appears on the **next** lock/login screen. To revert:
`./uninstall.sh`, or directly `sudo update-alternatives --remove gdm-theme.gresource <path>`
(Debian/Ubuntu) / `sudo ./lib/gdm-theme-setup.sh uninstall` (Fedora).

## Project layout: everything static is a resource

No colors, icon mappings, fonts, or app tables are hardcoded in the scripts.
To customize, edit the files under `themes/` and `assets/`; the build scripts
never need touching.

```text
themes/                 # ← the palettes. One JSON per theme = every color it uses.
  graphite.json         #   (colors + terminal ANSI + radius + icon fg + font)
  mono.json
  vercel.json
assets/                 # ← all other static resources
  fonts/                #   Geist / Geist Mono variable TTFs
  custom-icons/         #   hand-drawn Lucide-style marks for brand-less apps
  mapping.json          #   ~1660 freedesktop-name → Lucide-name mappings
  icon-overrides.json   #   brand/app/folder/vitals/desktop icon tables
lib/                    # build logic (parametrized by theme; imports config.mjs)
  config.mjs            #   single source of truth for paths + theme loading
  build-theme.mjs       #   themes/<name>.json → build/<name>/{gtk,shell,ptyxis,gdm}
  generate-icons.mjs    #   mapping.json + Lucide → build/<name>/Lucide
  gdm-theme-setup.sh    #   root helper: safely (un)theme the GDM login screen
  overlay-icons.mjs · lib-outline.mjs · patch-vitals.mjs
scripts/                # helpers (patch-desktop-icons.sh, dev pipeline)
install.sh · uninstall.sh
build/                  # generated output (gitignored)
```

### Change a color

Edit the hex value in `themes/<name>.json` and re-run
`./install.sh -t <name>` (add `-i`/`--terminal`/`-f` to refresh those too).

### Add a new theme

Drop a `themes/mytheme.json` (copy an existing one; the tweakcn/shadcn presets
are OKLCH, convert to hex) and run `./install.sh -t mytheme`.

### Update an app / folder / brand icon

Edit `assets/icon-overrides.json` (or add an SVG to `assets/custom-icons/`) and
re-run with `-i`.

## The Lucide icon theme

GNOME symbolic icons are recolored by GTK by **forcing `fill`** on every shape.
Lucide icons are *stroke* based (`fill:none; stroke:currentColor`), so a naive
copy renders as solid blobs. The build therefore emits two variants per name:

- **`name-symbolic.svg`**: the Lucide stroke is converted to a *fill-only*
  outline (the centerline is sampled as dense overlapping filled dots, giving
  round caps/joins for free). GTK's fill-recoloring then renders clean lines.
  See `lib/lib-outline.mjs`.
- **`name.svg`**: the original Lucide stroke, baked to the theme foreground,
  for non-symbolic requests (app grid, large file icons).

**App icons keep their identity** (`lib/overlay-icons.mjs`): popular apps
(Firefox, VS Code, Chrome, Discord, Telegram, Spotify, Docker, …) are drawn from
**Tabler Icons**' `brand-*` set, the same outline language as Lucide, so each
app stays recognizable *in* the line style. Apps with no brand keep their own
icon; a few brand-less ones use hand-drawn marks in `assets/custom-icons/`.

**Folders are distinctive**: the XDG/special folders get a Lucide folder
*variant* or a **folder composed with a small glyph emblem** (via `composeFolder`).

## Regenerating / customizing

```sh
npm install
node lib/build-theme.mjs vercel        # re-emit gtk/shell/ptyxis for a theme
node lib/generate-icons.mjs vercel     # re-emit the icon theme
```

To rebuild `assets/mapping.json` from scratch (needs the icon-mapping workflow):

```sh
node scripts/enumerate-icons.mjs && node scripts/prepass-icons.mjs
# run the mapping agents, then:
REBUILD_MAPPING=1 node lib/generate-icons.mjs
```

## Credits & licenses

- Palettes: the *Graphite*, *Mono*, and *Vercel* presets from
  [tweakcn](https://tweakcn.com) / shadcn.
- Icons: [Lucide](https://lucide.dev) (ISC) + [Tabler Icons](https://tabler.io/icons) (MIT).
- Font: [Geist](https://vercel.com/font) (OFL).
- This project's own code: MIT.
