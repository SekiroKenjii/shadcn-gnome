import { SCHEMES } from '../theme/catalog.mjs';
import { banner, compileForScheme } from './stylesheets.mjs';

export const gdmTarget = {
  id: 'gdm',
  description: 'Login screen fragments appended to the GNOME Shell theme gresource',
  build(context) {
    for (const scheme of SCHEMES) {
      context.output.write(`gdm/greeter-${scheme}.css`, banner(context, `GDM ${scheme}`) + compileForScheme(context, 'gdm/greeter.scss', scheme));
    }
    return 'gdm/greeter-{dark,light}.css';
  },
};
