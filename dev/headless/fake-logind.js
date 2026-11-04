#!/usr/bin/env -S gjs -m
// Minimal org.freedesktop.login1 so GNOME Shell starts in a container without
// systemd. Only what the shell touches during startup is implemented.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const SESSION_PATH = '/org/freedesktop/login1/session/auto';
const USER_PATH = '/org/freedesktop/login1/user/self';

const MANAGER_XML = `<node><interface name="org.freedesktop.login1.Manager">
  <method name="GetSession"><arg type="s" direction="in"/><arg type="o" direction="out"/></method>
  <method name="GetSessionByPID"><arg type="u" direction="in"/><arg type="o" direction="out"/></method>
  <method name="GetUser"><arg type="u" direction="in"/><arg type="o" direction="out"/></method>
  <method name="ListSessions"><arg type="a(susso)" direction="out"/></method>
  <method name="CanSuspend"><arg type="s" direction="out"/></method>
  <method name="CanHibernate"><arg type="s" direction="out"/></method>
  <method name="CanPowerOff"><arg type="s" direction="out"/></method>
  <method name="CanReboot"><arg type="s" direction="out"/></method>
  <method name="CanRebootToBootLoaderMenu"><arg type="s" direction="out"/></method>
  <method name="Inhibit"><arg type="s" direction="in"/><arg type="s" direction="in"/><arg type="s" direction="in"/><arg type="s" direction="in"/><arg type="h" direction="out"/></method>
  <signal name="PrepareForSleep"><arg type="b"/></signal>
</interface></node>`;

const SESSION_XML = `<node><interface name="org.freedesktop.login1.Session">
  <property name="Id" type="s" access="read"/>
  <property name="Active" type="b" access="read"/>
  <property name="Class" type="s" access="read"/>
  <property name="Type" type="s" access="read"/>
  <property name="Remote" type="b" access="read"/>
  <property name="State" type="s" access="read"/>
  <property name="LockedHint" type="b" access="read"/>
  <method name="SetLockedHint"><arg type="b" direction="in"/></method>
  <signal name="Lock"/>
  <signal name="Unlock"/>
</interface></node>`;

const USER_XML = `<node><interface name="org.freedesktop.login1.User">
  <property name="Display" type="(so)" access="read"/>
  <property name="IdleHint" type="b" access="read"/>
  <property name="Sessions" type="a(so)" access="read"/>
  <property name="State" type="s" access="read"/>
</interface></node>`;

class Manager {
    GetSession() {
        return SESSION_PATH;
    }
    GetSessionByPID() {
        return SESSION_PATH;
    }
    GetUser() {
        return USER_PATH;
    }
    ListSessions() {
        return [['auto', 0, 'user', 'seat0', SESSION_PATH]];
    }
    CanSuspend() {
        return 'na';
    }
    CanHibernate() {
        return 'na';
    }
    CanPowerOff() {
        return 'na';
    }
    CanReboot() {
        return 'na';
    }
    CanRebootToBootLoaderMenu() {
        return 'na';
    }
    InhibitAsync(_parameters, invocation) {
        invocation.return_dbus_error('org.freedesktop.DBus.Error.NotSupported', 'inhibitors are not available here');
    }
}

class User {
    get Display() {
        return ['auto', SESSION_PATH];
    }
    get IdleHint() {
        return false;
    }
    get Sessions() {
        return [['auto', SESSION_PATH]];
    }
    get State() {
        return 'active';
    }
}

class Session {
    get Id() {
        return 'auto';
    }
    get Active() {
        return true;
    }
    get Class() {
        return 'user';
    }
    get Type() {
        return 'wayland';
    }
    get Remote() {
        return false;
    }
    get State() {
        return 'active';
    }
    get LockedHint() {
        return false;
    }
    SetLockedHint() {}
}

const exported = [];
Gio.bus_own_name(
    Gio.BusType.SYSTEM,
    'org.freedesktop.login1',
    Gio.BusNameOwnerFlags.NONE,
    (connection) => {
        for (const [xml, implementation, path] of [
            [MANAGER_XML, new Manager(), '/org/freedesktop/login1'],
            [SESSION_XML, new Session(), SESSION_PATH],
            [USER_XML, new User(), USER_PATH],
        ]) {
            const object = Gio.DBusExportedObject.wrapJSObject(xml, implementation);
            object.export(connection, path);
            exported.push(object);
        }
    },
    null,
    () => printerr('could not own org.freedesktop.login1 (is another logind running?)'),
);

new GLib.MainLoop(null, false).run();
