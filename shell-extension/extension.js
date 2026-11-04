import Gio from 'gi://Gio';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const ICON_THEME_FOR_APP_SCHEME = {dark: 'Lucide', light: 'Lucide-Light'};

export default class ShadcnGnomeExtension extends Extension {
    enable() {
        this._interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        St.Settings.get().connectObject('notify::color-scheme', () => this._applyShellStylesheet(), this);
        this._interfaceSettings.connectObject('changed::color-scheme', () => this._matchIconTheme(), this);
        this._applyShellStylesheet();
        this._matchIconTheme();
    }

    disable() {
        St.Settings.get().disconnectObject(this);
        this._interfaceSettings.disconnectObject(this);
        this._interfaceSettings = null;
        Main.setThemeStylesheet(null);
        Main.loadTheme();
    }

    _applyShellStylesheet() {
        const variant = Main.getStyleVariant?.() === 'light' ? 'light' : 'dark';
        Main.setThemeStylesheet(this.dir.get_child(`theme-${variant}.css`).get_path());
        Main.loadTheme();
    }

    _matchIconTheme() {
        const appScheme = this._interfaceSettings.get_string('color-scheme') === 'prefer-dark' ? 'dark' : 'light';
        const wanted = ICON_THEME_FOR_APP_SCHEME[appScheme];
        const current = this._interfaceSettings.get_string('icon-theme');
        const managedByUs = Object.values(ICON_THEME_FOR_APP_SCHEME).includes(current);
        if (managedByUs && current !== wanted) this._interfaceSettings.set_string('icon-theme', wanted);
    }
}
