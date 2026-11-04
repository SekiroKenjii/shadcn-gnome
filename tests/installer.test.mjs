import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { paths } from '../src/core/paths.mjs';

function bash(script) {
  return execFileSync(
    'bash',
    [
      '-c',
      `set -euo pipefail; source "${paths.root}/installer/lib/log.sh"; source "${paths.root}/installer/lib/paths.sh"; source "${paths.root}/installer/lib/state.sh"; source "${paths.root}/installer/components/shell.sh"; ${script}`,
    ],
    { encoding: 'utf8' },
  ).trim();
}

test('GVariant string lists gain and lose extension ids', () => {
  assert.equal(bash(`gvariant_list_append "@as []" a@b`), "['a@b']");
  assert.equal(bash(`gvariant_list_append "['x@y']" a@b`), "['x@y', 'a@b']");
  assert.equal(bash(`gvariant_list_remove "['x@y', 'a@b', 'z@w']" a@b`), "['x@y', 'z@w']");
  assert.equal(bash(`gvariant_list_remove "['a@b']" a@b`), '[]');
});

test('install.sh rejects unknown themes and options', () => {
  const run = (...args) => {
    try {
      execFileSync(`${paths.root}/install.sh`, args, { stdio: 'pipe' });
      return 0;
    } catch (error) {
      return error.status;
    }
  };
  assert.notEqual(run('--theme', 'nope'), 0);
  assert.notEqual(run('--bogus'), 0);
  assert.notEqual(run('--scheme', 'sepia'), 0);
  assert.equal(run('--help'), 0);
});
