import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrastRatio, isLight, mix, parseHex, toHex, withAlpha } from '../src/core/color.mjs';

test('hex round-trips through rgb channels', () => {
  assert.deepEqual(parseHex('#1a2b3c'), { r: 26, g: 43, b: 60 });
  assert.equal(toHex({ r: 26, g: 43, b: 60 }), '#1a2b3c');
});

test('rejects anything that is not #rrggbb', () => {
  assert.throws(() => parseHex('#fff'));
  assert.throws(() => parseHex('red'));
});

test('contrast ratio matches the WCAG reference values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrastRatio('#777777', '#ffffff').toFixed(2), '4.48');
});

test('mix, alpha and lightness helpers', () => {
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(withAlpha('#ff0000', 0.5), 'rgba(255,0,0,0.5)');
  assert.ok(isLight('#f0f0f0'));
  assert.ok(!isLight('#1a1a1a'));
});
