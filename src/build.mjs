import { OutputDirectory } from './core/output.mjs';
import { themeBuildDir } from './core/paths.mjs';
import { selectTargets } from './targets/registry.mjs';
import { loadTheme, SCHEMES } from './theme/catalog.mjs';
import { resolvePalette } from './theme/palette.mjs';
import { designTokens } from './theme/tokens.mjs';

export function createBuildContext(themeId, options = {}) {
  const theme = loadTheme(themeId);
  const palettes = Object.fromEntries(SCHEMES.map((scheme) => [scheme, resolvePalette(theme, scheme, options)]));
  return {
    theme,
    palettes,
    tokens: designTokens(theme),
    options: { darkPanel: Boolean(options.darkPanel) },
    output: new OutputDirectory(options.outputDir ?? themeBuildDir(theme.id)),
  };
}

export function buildTheme(themeId, { targets, logger, ...options } = {}) {
  const context = createBuildContext(themeId, options);
  logger?.info(`building ${context.theme.label} → ${context.output.describe('')}`);
  const results = selectTargets(targets).map((target) => {
    const summary = target.build(context);
    logger?.done(`${target.id.padEnd(10)} ${summary}`);
    return { target: target.id, summary };
  });
  return { context, results };
}
