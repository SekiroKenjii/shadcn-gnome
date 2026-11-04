#!/usr/bin/env node
// Maintainer step 3 of 3: merge the pre-pass suggestions (build/icons/chunks)
// with refined mappings (build/icons/out/*.json) into assets/icons/mapping.json.
// Steps 1-2: scripts/mapping-enumerate.mjs then scripts/mapping-prepass.mjs.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { paths } from '../src/core/paths.mjs';
import { ICON_CONTEXTS, lucideInventory } from '../src/targets/icons/mapping.mjs';

const chunks = `${paths.build}/icons/chunks`;
const refined = `${paths.build}/icons/out`;
if (!existsSync(chunks)) throw new Error('run scripts/mapping-enumerate.mjs and scripts/mapping-prepass.mjs first');

const inventory = lucideInventory();
const mapping = Object.fromEntries(Object.keys(ICON_CONTEXTS).map((context) => [context, {}]));

for (const file of readdirSync(chunks)) {
  const { context, icons } = JSON.parse(readFileSync(`${chunks}/${file}`, 'utf8'));
  for (const icon of icons) mapping[context][icon.name] = icon.suggest;
}

let applied = 0;
let rejected = 0;
for (const file of existsSync(refined) ? readdirSync(refined).filter((name) => name.endsWith('.json')) : []) {
  const data = JSON.parse(readFileSync(`${refined}/${file}`, 'utf8'));
  const context = data.context ?? file.split('-')[0];
  for (const { name, lucide } of data.mappings ?? []) {
    if (!mapping[context] || !name || !lucide) continue;
    if (inventory.has(lucide)) {
      mapping[context][name] = lucide;
      applied += 1;
    } else {
      rejected += 1;
    }
  }
}

writeFileSync(paths.iconMapping, JSON.stringify(mapping));
console.log(`wrote ${paths.iconMapping}: ${applied} refined, ${rejected} rejected (unknown Lucide name)`);
