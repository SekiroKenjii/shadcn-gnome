// patch-rounded-corners.mjs — make rounded-window-corners@fxgn recompute a
// window's rounded-corner clip shortly AFTER it maps. Electron/Chromium grow
// their client-side shadow margin a moment after mapping (the buffer rect
// changes without a frame size-change), so the clip computed at map time is
// stale and a border/offset appears on the grown right/bottom edge. This adds
// a few delayed recomputes so the rounding matches the settled window.
//
// The extension overwrites its own files on update, so re-run this after
// updating rounded-window-corners. Idempotent. Usage: node patch-rounded-corners.mjs
import {readFileSync, writeFileSync, existsSync} from 'node:fs';

const F = `${process.env.HOME}/.local/share/gnome-shell/extensions/` +
    `rounded-window-corners@fxgn/manager/event_handlers.js`;

if (!existsSync(F)) { console.log('rounded-window-corners@fxgn not installed — skipping'); process.exit(0); }
let s = readFileSync(F, 'utf8');
if (s.includes('local patch — see shadcn-lucide-theme')) { console.log('already patched'); process.exit(0); }

const anchor = '    // Make sure the effect is applied correctly.\n    updateEffect(actor);\n}';
if (!s.includes(anchor)) {
    console.error('anchor not found — the extension changed; patch createEffect() by hand'); process.exit(1);
}
const block = `    // Make sure the effect is applied correctly.
    updateEffect(actor);
    // Electron/Chromium windows grow their client-side shadow margin a moment
    // AFTER mapping: the buffer rect changes without a frame size-change, so
    // the clip computed above is stale and a border/offset appears on the
    // grown (right/bottom) side. Recompute once the window has settled.
    // [local patch — see shadcn-lucide-theme; re-apply after ext updates]
    for (const ms of [200, 600, 1200]) {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            if (hasMetaWindow(actor) && actor.rwcCustomData &&
                getRoundedCornersEffect(actor)) {
                updateEffect(actor);
            }
            return GLib.SOURCE_REMOVE;
        });
    }
}`;
writeFileSync(F, s.replace(anchor, block));
console.log('patched rounded-window-corners@fxgn — log out/in to load it.');
