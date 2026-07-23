# shadcn-lucide-theme

A **shadcn-style desktop theme** (the *Graphite* palette) with a **complete
Lucide icon set**, for GNOME on Ubuntu (tested on GNOME 50 / Wayland,
Ubuntu 26.04). One command themes GTK4/libadwaita + GTK3 apps, the GNOME
Shell (panel, quick settings, calendar, notifications), the Ptyxis terminal,
and swaps the whole system icon set for monochrome Lucide line icons, with the
**Geist** typeface.

Everything is neutral graphite grays, thin 1px borders, 6px radius — the
shadcn look — and every UI glyph is a Lucide line icon.

## Requirements

`node` + `npm` (for Lucide SVGs + path sampling), `gsettings`, `dconf`,
`fc-cache`. The GNOME Shell theme needs the **User Themes** extension enabled.

## Install

```sh
./install.sh
```

Then **log out and back in** for the Shell theme and icon theme to apply
everywhere (GTK apps and the terminal update on their next launch).

`./uninstall.sh` reverts the settings and removes the installed files.

## What it does

| Surface | How |
| ------- | --- |
| GTK4 / libadwaita | `~/.config/gtk-4.0/gtk.css` — shadcn named colors + outlined widgets (6px radius, 1px borders) |
| GTK3 | `~/.config/gtk-3.0/gtk.css` |
| GNOME Shell | `~/.themes/Shadcn-Graphite/` (Yaru-dark base + a graphite override), via User Themes |
| Terminal | a "Shadcn Graphite" Ptyxis palette |
| Icons | `~/.local/share/icons/Lucide` — a freedesktop theme covering ~1660 names with Lucide |
| Font | Geist Sans (UI) + Geist Mono, installed to `~/.local/share/fonts` |
| Accent | left to the system accent (Settings → Appearance); the theme is neutral |

Dark-first (the machine runs `prefer-dark`). All values come from one place —
the `dark`/`light` palette objects in `build-theme.mjs` — so re-theming to a
different shadcn preset is a one-object edit.

## The Lucide icon theme (the interesting part)

GNOME symbolic icons are recolored by GTK by **forcing `fill`** on every shape.
Lucide icons are *stroke* based (`fill:none; stroke:currentColor`), so a naive
copy renders as solid black blobs (a filled folder, a filled disc). The build
therefore emits two variants per name:

- **`name-symbolic.svg`** — the Lucide stroke is converted to a *fill-only*
  outline (the centerline is sampled and drawn as dense overlapping filled
  dots, which gives round caps/joins for free). GTK's fill-recoloring then
  renders clean lines in the theme foreground. See `lib-outline.mjs`.
- **`name.svg`** — the original Lucide stroke, baked to the graphite
  foreground, for non-symbolic requests (app grid, large file icons).

The freedesktop-name → Lucide mapping (`mapping.json`, ~1660 entries) was built
by enumerating every icon name Yaru + Adwaita + installed apps request, an
algorithmic first pass (`prepass-icons.mjs`), then a multi-agent semantic pass
with adversarial review. The theme inherits `Adwaita, hicolor` so the long tail
stays monochrome (never the colorful Yaru set).

## Regenerating / customizing

```sh
npm install
node build-theme.mjs         # re-emit gtk/shell/ptyxis from the palette
node generate-icons.mjs      # re-emit the icon theme from mapping.json + Lucide
```

To rebuild the mapping from scratch (needs the icon-mapping workflow):
`node enumerate-icons.mjs && node prepass-icons.mjs`, run the mapping agents,
then `node generate-icons.mjs` writes a fresh `mapping.json`.

## Credits & licenses

- Palette: the *Graphite* preset from [tweakcn](https://tweakcn.com) / shadcn.
- Icons: [Lucide](https://lucide.dev) (ISC).
- Font: [Geist](https://vercel.com/font) (OFL).
- This project's own code: MIT.
