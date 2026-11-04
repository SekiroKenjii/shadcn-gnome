# Development

Everything here runs without changing your own desktop: themes are installed
into throwaway `HOME` directories, GNOME Shell runs nested or headless, and the
login screen is previewed in a private mount namespace or in a VM.

## Quick start

```bash
npm ci
npm run build          # every theme × every target into build/
npm test               # unit tests (node:test)
npm run lint           # Biome + ShellCheck
npm run preview -- -t vercel   # contact sheet: palettes, icons, cursors, wallpapers
```

`node bin/shadcn-gnome.mjs --help` lists the CLI commands (`build`, `themes`,
`targets`, `contrast`, `field`, `vitals`, `desktop-overrides`).

## Which tool tests what

| Aspect | Tool | Needs |
| --- | --- | --- |
| Palettes, contrast, SCSS, icon mapping, cursor encoding | `npm test` | Node |
| Icons, cursors, wallpapers by eye | `npm run preview` | Node, a browser |
| GNOME Shell, interactive | `dev/sandbox.sh` + `dev/scenes.sh` | GNOME Shell, a graphical session |
| GTK4/libadwaita, Files, Settings, Ptyxis | `dev/apps.sh` inside the sandbox | the apps (the toolbox image has them) |
| GNOME Shell, screenshots | `dev/headless/capture.sh` | GNOME Shell (works in containers and CI) |
| Login screen styling | `dev/gdm-preview.sh` | GNOME Shell, bubblewrap |
| Login screen install (sudo, alternatives, dconf) | `dev/vm/*` | QEMU |
| Installer and uninstaller | `dev/sandbox.sh` (runs `install.sh` in its HOME) | GNOME settings schemas |

## The toolbox (latest GNOME on any host)

```bash
dev/toolbox.sh            # builds dev/container/Containerfile, enters it
dev/toolbox.sh --rebuild  # after changing the Containerfile
```

The image is Fedora's toolbox base with GNOME Shell, mutter-devkit, the GTK4
widget factory, the libadwaita demo, Files, Settings, Ptyxis, Text Editor,
Node, ShellCheck and bubblewrap. Toolbox and distrobox share your Wayland
session, so the nested Shell opens as a window on your desktop.

## Sandbox: a nested GNOME Shell

```bash
dev/sandbox.sh -t graphite --scheme dark          # Shell in a window, theme installed in build/sandbox/home
dev/sandbox.sh -t mono --scheme light --fresh -- --icon --cursor
```

From a second terminal, while it runs:

```bash
dev/scenes.sh --list
dev/scenes.sh quick-settings
dev/scenes.sh calendar --shot calendar.png
dev/apps.sh                       # widget factory, adwaita demo, Files, Settings, Ptyxis, …
dev/apps.sh gtk4-widget-factory
dev/reload.sh                     # rebuild gtk+shell and reload the Shell stylesheet live
```

Toggle **Dark Style** in the sandbox's quick settings to check that the Shell,
GTK apps and the icon theme follow the color scheme.

The sandbox enables a development-only extension
(`dev/headless/devkit@shadcn-gnome.dev`). It unlocks GNOME Shell's Eval and
screenshot D-Bus API and exposes `shadcnDevkit.show(scene)`. Never install it
on a real desktop.

## Headless screenshots

```bash
dev/headless/capture.sh -t graphite                 # both schemes, every scene
dev/headless/capture.sh -t vercel --scheme light --scenes quick-settings,calendar
```

Screens land in `build/screens/<theme>/<scheme>-<scene>.png`. In containers
without systemd the script starts a system bus and `dev/headless/fake-logind.js`,
a minimal stand-in for `org.freedesktop.login1`.

## Login screen

```bash
dev/gdm-preview.sh -t graphite --build-only        # build + validate the gresource, no root
dev/gdm-preview.sh -t graphite --scheme light       # greeter in a window
dev/gdm-preview.sh -t vercel --shot greeter.png     # headless screenshot of the greeter chrome
```

The preview compiles the greeter fragments, runs
`installer/gdm-helper.sh build` against your distro's gresource, and starts
GNOME Shell in a GDM-derived session mode inside `bwrap`, with the built
gresource bind-mounted over the system one. Nothing outside the mount
namespace changes. The login prompt itself needs GDM's own D-Bus services, so
in containers `--shot` captures the greeter chrome (panel, notifications,
background) and the VM below is the authoritative check.

### The real thing: a VM

`--gdm` needs root, `update-alternatives` and dconf, so it is tested in a
disposable VM:

```bash
dev/vm/create.sh --distro ubuntu      # or --distro fedora; provisions a desktop with cloud-init
dev/vm/run.sh                         # boots a window on the provisioned greeter
dev/vm/sync.sh                        # copies the working tree into ~/shadcn-gnome
dev/vm/ssh.sh 'cd shadcn-gnome && ./install.sh --all --gdm'
dev/vm/reset.sh                       # back to the clean, provisioned state
```

Log out in the VM to see the greeter; lock the screen to see the unlock
dialog. If the greeter ever breaks, `Ctrl+Alt+F3`, log in, and run
`sudo ~/shadcn-gnome/installer/gdm-helper.sh uninstall`.

## Testing checklist before a release

1. `npm run lint && npm test && npm run build`
2. `npm run contrast` for every theme (AA for every design pair)
3. `dev/headless/capture.sh` for every theme, both schemes; compare with the design boards
4. In the sandbox: Dark Style toggle, Alt+Tab, workspace switcher, lock screen, `dev/apps.sh`
5. In the VM: `./install.sh --all --gdm`, log out, lock, then `./uninstall.sh` and check the greeter is stock again

## Maintaining the icon mapping

```bash
npm run mapping:enumerate   # every icon name the system requests → build/icons/worklist.json
npm run mapping:prepass     # algorithmic Lucide suggestions → build/icons/chunks/
# refine build/icons/chunks into build/icons/out/*.json (by hand or with agents)
npm run mapping:merge       # writes assets/icons/mapping.json
```

Deliberate design choices (emblems, GNOME 51 apps, folders) belong in
`assets/icons/overrides.json`, not in the generated mapping.
