import { readFileSync } from 'node:fs';
import { paths } from '../core/paths.mjs';
import { SCHEMES } from '../theme/catalog.mjs';
import { banner, compileForScheme } from './stylesheets.mjs';

export const SHELL_EXTENSION_UUID = 'shadcn-gnome@sekirokenjii.github.io';
const SUPPORTED_SHELL_VERSIONS = ['47', '48', '49', '50', '51'];

export const shellTarget = {
  id: 'shell',
  description: 'GNOME Shell theme, delivered as a companion extension that follows the color scheme',
  build(context) {
    const extension = context.output.subdirectory(`gnome-shell/${SHELL_EXTENSION_UUID}`);
    for (const scheme of SCHEMES) {
      extension.write(`theme-${scheme}.css`, banner(context, `GNOME Shell ${scheme}`) + compileForScheme(context, 'shell/gnome-shell.scss', scheme));
    }
    extension.write('metadata.json', `${JSON.stringify(extensionMetadata(context.theme), null, 2)}\n`);
    extension.write('extension.js', readFileSync(`${paths.shellExtension}/extension.js`, 'utf8'));
    return `gnome-shell/${SHELL_EXTENSION_UUID}/`;
  },
};

function extensionMetadata(theme) {
  return {
    uuid: SHELL_EXTENSION_UUID,
    name: 'shadcn-gnome',
    description: `${theme.label} for GNOME Shell. Switches between the light and dark stylesheet with the system color scheme.`,
    url: 'https://github.com/SekiroKenjii/shadcn-gnome',
    'shell-version': SUPPORTED_SHELL_VERSIONS,
    'session-modes': ['user', 'unlock-dialog'],
    'shadcn-theme': theme.id,
  };
}
