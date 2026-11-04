import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJson } from '../src/core/json.mjs';
import { paths } from '../src/core/paths.mjs';
import { animationAngles, CURSOR_VARIANTS, cursorSvg } from '../src/targets/cursors/drawing.mjs';
import { decodeXcursorHeader, encodeXcursor } from '../src/targets/cursors/xcursor.mjs';

const spec = readJson(paths.cursorSpec);

test('every CSS cursor name and X11 alias resolves to exactly one cursor', () => {
  const owners = new Map();
  for (const cursor of spec.cursors) {
    for (const name of [cursor.name, ...cursor.aliases]) {
      assert.ok(!owners.has(name), `${name} is claimed by ${owners.get(name)} and ${cursor.name}`);
      owners.set(name, cursor.name);
    }
  }
});

test('the full CSS cursor set from the design is present', () => {
  const names = spec.cursors.map((cursor) => cursor.name);
  for (const required of [
    'default',
    'pointer',
    'text',
    'wait',
    'progress',
    'not-allowed',
    'grab',
    'grabbing',
    'move',
    'ew-resize',
    'ns-resize',
    'nwse-resize',
    'nesw-resize',
    'col-resize',
    'row-resize',
    'zoom-in',
    'zoom-out',
  ]) {
    assert.ok(names.includes(required), required);
  }
});

test('hotspots sit inside the drawing grid', () => {
  for (const { name, hotspot } of spec.cursors) {
    assert.ok(
      hotspot.every((value) => value >= 0 && value < spec.grid),
      name,
    );
  }
});

test('spinning cursors animate, static ones have a single frame', () => {
  const wait = spec.cursors.find((cursor) => cursor.name === 'wait');
  const pointer = spec.cursors.find((cursor) => cursor.name === 'pointer');
  assert.equal(animationAngles(wait, spec.spinner).length, spec.spinner.frames);
  assert.deepEqual(animationAngles(pointer, spec.spinner), [0]);
});

test('drawings use the variant colors and the theme stroke join', () => {
  const svg = cursorSvg(spec.cursors[0], {
    paths: spec.paths,
    colors: { fill: CURSOR_VARIANTS.dark.fill, outline: CURSOR_VARIANTS.dark.outline },
    join: 'miter',
    grid: spec.grid,
  });
  assert.match(svg, /fill="#0a0a0a"/);
  assert.match(svg, /stroke-linejoin="miter"/);
  assert.match(svg, /viewBox="0 0 32 32"/);
});

test('Xcursor encoding round-trips image headers and pixel order', () => {
  const rgba = Buffer.from([10, 20, 30, 255, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const file = encodeXcursor([{ nominalSize: 2, width: 2, height: 2, xhot: 1, yhot: 0, delay: 60, rgba }]);
  assert.deepEqual(decodeXcursorHeader(file), [{ nominalSize: 2, width: 2, height: 2, xhot: 1, yhot: 0, delay: 60 }]);
  const firstPixel = file.subarray(16 + 12 + 36, 16 + 12 + 36 + 4);
  assert.deepEqual([...firstPixel], [30, 20, 10, 255]);
});
