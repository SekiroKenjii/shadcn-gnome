import { SCHEMES } from '../theme/catalog.mjs';
import { banner, compileForScheme } from './stylesheets.mjs';

export const gtkTarget = {
  id: 'gtk',
  description: 'GTK4/libadwaita (one stylesheet for both schemes) and GTK3',
  build(context) {
    const { output } = context;
    output.write('gtk-4.0/gtk.css', banner(context, 'GTK4') + compileForScheme(context, 'gtk4/gtk.scss', 'dark'));
    for (const scheme of SCHEMES) {
      output.write(`gtk-3.0/gtk-${scheme}.css`, banner(context, `GTK3 ${scheme}`) + compileForScheme(context, 'gtk3/gtk.scss', scheme));
    }
    return 'gtk-4.0/gtk.css, gtk-3.0/gtk-{dark,light}.css';
  },
};
