import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVitestCommand,
  normalizeRelativeFile,
  resolveVitestWorkspace,
} from './debug-vitest-current.mjs';

test('normalizeRelativeFile normalizes separators and leading dot slash', () => {
  assert.equal(
    normalizeRelativeFile('.\\apps\\api\\src\\modules\\health\\__tests__\\health.routes.test.ts'),
    'apps/api/src/modules/health/__tests__/health.routes.test.ts',
  );
});

test('resolveVitestWorkspace maps API tests to api workspace filter', () => {
  const result = resolveVitestWorkspace(
    'apps/api/src/modules/health/__tests__/health.routes.test.ts',
  );

  assert.deepEqual(result, {
    filter: '@the-dmz/api',
    fileInWorkspace: 'src/modules/health/__tests__/health.routes.test.ts',
    normalizedFile: 'apps/api/src/modules/health/__tests__/health.routes.test.ts',
  });
});

test('resolveVitestWorkspace maps web tests to web workspace filter', () => {
  const result = resolveVitestWorkspace('apps/web/src/lib/utils/time.test.ts');

  assert.deepEqual(result, {
    filter: '@the-dmz/web',
    fileInWorkspace: 'src/lib/utils/time.test.ts',
    normalizedFile: 'apps/web/src/lib/utils/time.test.ts',
  });
});

test('resolveVitestWorkspace maps shared tests to shared workspace filter', () => {
  const result = resolveVitestWorkspace('packages/shared/src/utils/type-guards.test.ts');

  assert.deepEqual(result, {
    filter: '@the-dmz/shared',
    fileInWorkspace: 'src/utils/type-guards.test.ts',
    normalizedFile: 'packages/shared/src/utils/type-guards.test.ts',
  });
});

test('resolveVitestWorkspace rejects unsupported files', () => {
  assert.throws(() => resolveVitestWorkspace('docs/BRD.md'), /Unsupported test file path/);
});

test('buildVitestCommand returns a runnable pnpm command', () => {
  const command = buildVitestCommand('apps/web/src/lib/config/env.test.ts');

  assert.deepEqual(command, {
    command: 'pnpm',
    args: [
      '--filter',
      '@the-dmz/web',
      'exec',
      'vitest',
      'run',
      'src/lib/config/env.test.ts',
      '--inspect-brk',
      '--no-file-parallelism',
    ],
  });
});
