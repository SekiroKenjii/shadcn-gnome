// patch-rounded-corners.mjs — make rounded-window-corners@fxgn recompute a
// window's rounded-corner clip shortly AFTER it maps AND after it is restored
// from a minimize. Electron/Chromium apps grow / re-establish their client-side
// shadow margin a moment later (the buffer rect changes without a frame
// size-change), so the clip computed at map/restore time is stale and a
// border/offset appears on the grown right/bottom edge. This is why the glitch
// only shows after the app's OWN minimize button (a client-initiated minimize
// the app is told about) and never after a dock-icon minimize.
//
// The extension overwrites its own files on update, so re-run this afterwards.
// Idempotent. Usage: node patch-rounded-corners.mjs
import {readFileSync, writeFileSync, existsSync} from 'node:fs';

const F = `${process.env.HOME}/.local/share/gnome-shell/extensions/` +
    `rounded-window-corners@fxgn/manager/event_handlers.js`;

const settle = (delays, why) => `
    // ${why}
    // [local patch — see shadcn-lucide-theme; re-apply after ext updates]
    for (const ms of [${delays.join(', ')}]) {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            if (hasMetaWindow(actor) && actor.rwcCustomData &&
                getRoundedCornersEffect(actor)) {
                updateEffect(actor);
            }
            return GLib.SOURCE_REMOVE;
        });
    }`;

// Each patch: a unique marker to detect it, the anchor to insert after, and the
// settle block to insert. Anchors are matched verbatim against the pristine file.
const PATCHES = [
    {
        marker: 'grow their client-side shadow margin a moment',
        anchor: '    // Make sure the effect is applied correctly.\n    updateEffect(actor);\n}',
        insert: '    // Make sure the effect is applied correctly.\n    updateEffect(actor);' +
            settle([200, 600, 1200],
                'Electron/Chromium windows grow their client-side shadow margin a moment\n' +
                '    // AFTER mapping; recompute once the window has settled.') + '\n}',
    },
    {
        marker: 're-establish their CSD shadow margin when restored',
        anchor: '                source.disconnect(id);\n            }\n        });\n    }\n}\nexport function onRestacked() {',
        insert: '                source.disconnect(id);\n            }\n        });\n    }' +
            settle([150, 500, 1200],
                'Electron/Chromium apps re-establish their CSD shadow margin when restored\n' +
                '    // from a client-initiated (titlebar-button) minimize; recompute after.') +
            '\n}\nexport function onRestacked() {',
    },
];

if (!existsSync(F)) { console.log('rounded-window-corners@fxgn not installed — skipping'); process.exit(0); }
let s = readFileSync(F, 'utf8');
let applied = 0;
for (const p of PATCHES) {
    if (s.includes(p.marker)) continue;              // already patched
    if (!s.includes(p.anchor)) { console.error(`anchor not found for "${p.marker}" — the extension changed; patch by hand`); continue; }
    s = s.replace(p.anchor, p.insert);
    applied++;
}
if (applied) { writeFileSync(F, s); console.log(`applied ${applied} patch(es) — log out/in to load.`); }
else console.log('already patched (nothing to do).');
