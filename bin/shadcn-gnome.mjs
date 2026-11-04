#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { buildTheme } from '../src/build.mjs';
import { contrastReport } from '../src/commands/contrast.mjs';
import { patchVitals, restoreVitals } from '../src/commands/vitals.mjs';
import { createLogger } from '../src/core/logger.mjs';
import { loadIconOverrides } from '../src/targets/icons/mapping.mjs';
import { TARGETS } from '../src/targets/registry.mjs';
import { listThemeIds, loadTheme, SCHEMES } from '../src/theme/catalog.mjs';
import { resolvePalette } from '../src/theme/palette.mjs';

const USAGE = `shadcn-gnome <command> [options]

Commands:
  build              Generate every surface into build/<theme>/
    -t, --theme      theme id, or "all" (default: graphite)
    --target         comma-separated subset: ${Object.keys(TARGETS).join(', ')}
    --dark-panel     keep the top bar dark in the light scheme
    -o, --out        output directory (single theme only)
    -q, --quiet      only report problems
  themes             List available themes
  targets            List build targets
  contrast           Print WCAG contrast checks for a theme (-t)
  field <path>       Print a theme field, e.g. "label" or "fonts.interface" (-t)
  vitals patch|restore [dir]
                     Recolor (or restore) the Vitals extension's bundled icons
  desktop-overrides  Print desktop-id<TAB>icon pairs for patched launchers
`;

const commands = {
  build({ values }) {
    const logger = createLogger({ quiet: values.quiet });
    const themeIds = values.theme === 'all' ? listThemeIds() : [values.theme];
    if (values.out && themeIds.length > 1) throw new Error('--out works with a single theme only');
    for (const themeId of themeIds) {
      buildTheme(themeId, {
        logger,
        targets: values.target
          ?.split(',')
          .map((id) => id.trim())
          .filter(Boolean),
        darkPanel: values['dark-panel'],
        outputDir: values.out,
      });
    }
  },
  themes() {
    for (const id of listThemeIds()) {
      const theme = loadTheme(id);
      console.log(`${id.padEnd(10)} radius ${String(theme.radius).padEnd(3)} ${theme.wallpaper.padEnd(10)} ${theme.description ?? ''}`);
    }
  },
  targets() {
    for (const target of Object.values(TARGETS)) console.log(`${target.id.padEnd(11)} ${target.description}`);
  },
  contrast({ values }) {
    const theme = loadTheme(values.theme);
    let failures = 0;
    for (const scheme of SCHEMES) {
      console.log(`${theme.label} · ${scheme}`);
      for (const check of contrastReport(resolvePalette(theme, scheme))) {
        if (check.grade === 'fail') failures += 1;
        console.log(`  ${check.label.padEnd(24)} ${check.ratio.toFixed(2).padStart(6)}:1  ${check.grade}`);
      }
    }
    process.exitCode = failures ? 1 : 0;
  },
  field({ values, positionals }) {
    const value = positionals[1]?.split('.').reduce((node, key) => node?.[key], loadTheme(values.theme));
    if (value === undefined) throw new Error(`theme "${values.theme}" has no field "${positionals[1]}"`);
    process.stdout.write(typeof value === 'object' ? JSON.stringify(value) : String(value));
  },
  vitals({ positionals }) {
    const [, action, directory] = positionals;
    if (action === 'patch') {
      const { installed, patched, missing } = patchVitals(directory);
      if (!installed) return console.log('Vitals is not installed; nothing to patch');
      for (const metric of missing) console.warn(`no Lucide icon mapped for ${metric}`);
      return console.log(`patched ${patched} Vitals icons (originals kept in icons/_backup-*)`);
    }
    if (action === 'restore') return console.log(`restored ${restoreVitals(directory).restored} Vitals icon set(s)`);
    throw new Error('usage: shadcn-gnome vitals patch|restore [dir]');
  },
  'desktop-overrides'() {
    for (const [desktopId, icon] of Object.entries(loadIconOverrides().desktopOverrides ?? {})) console.log(`${desktopId}\t${icon}`);
  },
};

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      theme: { type: 'string', short: 't', default: 'graphite' },
      target: { type: 'string' },
      'dark-panel': { type: 'boolean', default: false },
      out: { type: 'string', short: 'o' },
      quiet: { type: 'boolean', short: 'q', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const command = commands[positionals[0]];
  if (values.help || !command) {
    process.stdout.write(USAGE);
    process.exitCode = values.help || !positionals[0] ? 0 : 2;
    return;
  }
  command({ values, positionals });
}

try {
  main(process.argv.slice(2));
} catch (error) {
  createLogger().error(error.message);
  process.exitCode = 1;
}
