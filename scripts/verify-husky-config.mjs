import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));

const lintStaged = readJson('.lintstagedrc.json');
const commitlint = readJson('.commitlintrc.json');

const expectedLintStaged = {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.svelte': ['eslint --fix', 'prettier --write --plugin prettier-plugin-svelte'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '*.css': ['prettier --write'],
};

const expectedCommitlint = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['web', 'api', 'shared', 'infra', 'ci', 'deps']],
    'subject-case': [2, 'always', 'lower-case'],
  },
};

const assertDeepEqual = (actual, expected, name) => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Unexpected ${name} configuration.`);
  }
};

const readHook = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8').trim();

const expectedHooks = {
  '.husky/pre-commit': '#!/usr/bin/env sh\npnpm exec lint-staged',
  '.husky/pre-push': '#!/usr/bin/env sh\npnpm typecheck',
  '.husky/commit-msg': '#!/usr/bin/env sh\npnpm exec commitlint --edit "$1"',
};

assertDeepEqual(lintStaged, expectedLintStaged, 'lint-staged');
assertDeepEqual(commitlint, expectedCommitlint, 'commitlint');

for (const [hookPath, expectedContent] of Object.entries(expectedHooks)) {
  const actual = readHook(hookPath);
  if (actual !== expectedContent) {
    throw new Error(`Unexpected hook contents for ${hookPath}.`);
  }
}

process.stdout.write('Husky and lint-staged configuration verified.\n');
