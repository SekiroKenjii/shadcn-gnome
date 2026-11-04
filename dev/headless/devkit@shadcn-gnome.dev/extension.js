import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Development-only scene driver for headless screenshots. It unlocks the
// Eval/Screenshot D-Bus API, so it must never run on a real desktop.
const SCENES = {
    desktop() {},
    'quick-settings'() {
        Main.panel.statusArea.quickSettings.menu.open();
    },
    calendar() {
        Main.notify('Files', '12 items copied to Projects');
        Main.panel.statusArea.dateMenu.menu.open();
    },
    notification() {
        Main.notify('Calendar', 'Design review in 15 minutes');
    },
    overview() {
        Main.overview.show();
    },
    'app-grid'() {
        Main.overview.showApps();
    },
    osd() {
        const icon = new Gio.ThemedIcon({name: 'audio-volume-high-symbolic'});
        if (Main.osdWindowManager.showAll) Main.osdWindowManager.showAll(icon, null, 0.64, 1);
        else Main.osdWindowManager.show(-1, icon, null, 0.64, 1);
    },
    'run-dialog'() {
        Main.openRunDialog();
    },
    'screenshot-ui'() {
        Main.screenshotUI.open();
    },
    'lock-screen'() {
        Main.screenShield.lock(false);
    },
    greeter() {
        Main.screenShield.showDialog();
    },
};

export default class DevkitExtension extends Extension {
    enable() {
        global.context.unsafe_mode = true;
        const seat = Clutter.get_default_backend().get_default_seat();
        this._keyboard = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
        globalThis.shadcnDevkit = {
            scenes: Object.keys(SCENES),
            show: (name) => this._show(name),
            reset: () => this._reset(),
        };
    }

    disable() {
        delete globalThis.shadcnDevkit;
        this._keyboard = null;
        global.context.unsafe_mode = false;
    }

    _show(name) {
        const scene = SCENES[name];
        if (!scene) throw new Error(`unknown scene ${name}; known: ${Object.keys(SCENES).join(', ')}`);
        scene();
        return name;
    }

    // Escape is delivered asynchronously, so callers wait before the next scene.
    _reset() {
        this._press(Clutter.KEY_Escape);
        Main.panel.menuManager.activeMenu?.close();
        Main.overview.hide();
    }

    _press(keyval) {
        const time = global.get_current_time() * 1000;
        this._keyboard.notify_keyval(time, keyval, Clutter.KeyState.PRESSED);
        this._keyboard.notify_keyval(time, keyval, Clutter.KeyState.RELEASED);
    }
}
