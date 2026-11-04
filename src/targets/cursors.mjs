import { Resvg } from '@resvg/resvg-js';
import { readJson } from '../core/json.mjs';
import { paths } from '../core/paths.mjs';
import { animationAngles, CURSOR_VARIANTS, cursorSvg } from './cursors/drawing.mjs';
import { encodeXcursor } from './cursors/xcursor.mjs';

export const cursorsTarget = {
  id: 'cursors',
  description: 'SVG cursor theme (cursors_scalable) with Xcursor fallbacks, light and dark',
  build(context) {
    const spec = readJson(paths.cursorSpec);
    const built = Object.values(CURSOR_VARIANTS).map((variant) => buildVariant(context, spec, variant));
    return built.join(', ');
  },
};

function buildVariant(context, spec, variant) {
  const theme = context.output.subdirectory(`cursors/${variant.themeName}`);
  theme.clear();
  const colors = { fill: variant.fill, outline: variant.outline };
  const drawing = { paths: spec.paths, colors, join: context.theme.strokeJoin, grid: spec.grid };

  for (const cursor of spec.cursors) {
    const angles = animationAngles(cursor, spec.spinner);
    const delay = angles.length > 1 ? spec.spinner.delayMs : 0;
    const frames = angles.map((angle) => cursorSvg(cursor, { ...drawing, angle }));
    writeScalable(theme, cursor, frames, spec, delay);
    theme.write(`cursors/${cursor.name}`, encodeXcursor(rasterize(frames, cursor, spec, delay)));
    for (const alias of cursor.aliases) {
      theme.link(`cursors/${alias}`, cursor.name);
      theme.link(`cursors_scalable/${alias}`, cursor.name);
    }
  }
  theme.write(
    'index.theme',
    `[Icon Theme]\nName=${variant.themeName}\nComment=${context.theme.label} cursors (${variant.fill === '#fafafa' ? 'light' : 'dark'} fill)\nInherits=Adwaita\n`,
  );
  theme.write('cursor.theme', `[Icon Theme]\nInherits=${variant.themeName}\n`);
  return `cursors/${variant.themeName} (${spec.cursors.length} cursors)`;
}

// The SVGs are drawn on the 32-unit grid; declaring that grid as the nominal
// size keeps hotspots integral while the compositor scales to cursor-size.
function writeScalable(theme, cursor, frames, spec, delay) {
  const metadata = frames.map((svg, index) => {
    const filename = frames.length > 1 ? `${cursor.name}-${String(index + 1).padStart(2, '0')}.svg` : `${cursor.name}.svg`;
    theme.write(`cursors_scalable/${cursor.name}/${filename}`, svg);
    return {
      filename,
      hotspot_x: cursor.hotspot[0],
      hotspot_y: cursor.hotspot[1],
      nominal_size: spec.grid,
      ...(delay ? { delay } : {}),
    };
  });
  theme.write(`cursors_scalable/${cursor.name}/metadata.json`, `${JSON.stringify(metadata, null, 2)}\n`);
}

function rasterize(frames, cursor, spec, delay) {
  return spec.xcursorSizes.flatMap((size) =>
    frames.map((svg) => {
      const image = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render();
      return {
        nominalSize: size,
        width: image.width,
        height: image.height,
        xhot: Math.floor((cursor.hotspot[0] * size) / spec.grid),
        yhot: Math.floor((cursor.hotspot[1] * size) / spec.grid),
        delay,
        rgba: image.pixels,
      };
    }),
  );
}
