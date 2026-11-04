import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const vendor = `${repoRoot}/node_modules`;

export const paths = Object.freeze({
  root: repoRoot,
  themes: `${repoRoot}/themes`,
  styles: `${repoRoot}/styles`,
  shellExtension: `${repoRoot}/shell-extension`,
  build: `${repoRoot}/build`,
  fonts: `${repoRoot}/assets/fonts`,
  terminalAnsi: `${repoRoot}/assets/terminal/ansi.json`,
  cursorSpec: `${repoRoot}/assets/cursors/cursors.json`,
  iconMapping: `${repoRoot}/assets/icons/mapping.json`,
  iconOverrides: `${repoRoot}/assets/icons/overrides.json`,
  customIcons: `${repoRoot}/assets/icons/custom`,
  lucideIcons: `${vendor}/lucide-static/icons`,
  tablerIcons: `${vendor}/@tabler/icons/icons/outline`,
});

export function themeBuildDir(themeId) {
  return `${paths.build}/${themeId}`;
}
