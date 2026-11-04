import { readdirSync } from 'node:fs';
import { readJson } from '../../core/json.mjs';
import { paths } from '../../core/paths.mjs';

export const ICON_CONTEXTS = Object.freeze({
  actions: 'Actions',
  status: 'Status',
  devices: 'Devices',
  places: 'Places',
  mimetypes: 'MimeTypes',
  emblems: 'Emblems',
  categories: 'Categories',
  apps: 'Applications',
});

export function lucideInventory(directory = paths.lucideIcons) {
  return new Set(
    readdirSync(directory)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -'.svg'.length)),
  );
}

export function loadIconOverrides() {
  return readJson(paths.iconOverrides);
}

// Vendored mapping, then required placeholders, then deliberate design remaps.
export function resolveMapping({ vendored = readJson(paths.iconMapping), overrides, inventory }) {
  const mapping = Object.fromEntries(Object.keys(ICON_CONTEXTS).map((context) => [context, { ...vendored[context] }]));
  for (const [context, names] of Object.entries(overrides.generic ?? {})) {
    for (const [name, icon] of Object.entries(names)) {
      if (mapping[context] && !mapping[context][name] && inventory.has(icon)) mapping[context][name] = icon;
    }
  }
  for (const [context, names] of Object.entries(overrides.overrides ?? {})) {
    for (const [name, icon] of Object.entries(names)) {
      if (mapping[context] && inventory.has(icon)) mapping[context][name] = icon;
    }
  }
  return mapping;
}

export function systemAppMatcher(overrides) {
  const allowlist = new Set(overrides.systemApps ?? []);
  const prefixes = overrides.systemAppPrefixes ?? [];
  return (name) => allowlist.has(name) || prefixes.some((prefix) => name.startsWith(prefix));
}
