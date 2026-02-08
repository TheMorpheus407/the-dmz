import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = async (relativePath) => {
  const filePath = path.join(ROOT_DIR, relativePath);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const readText = async (relativePath) => {
  const filePath = path.join(ROOT_DIR, relativePath);
  return readFile(filePath, 'utf8');
};

test('renovate.json configures schedule, semantic commits, and security labels', async () => {
  const config = await readJson('renovate.json');

  assert.equal(config.$schema, 'https://docs.renovatebot.com/renovate-schema.json');
  assert.deepEqual(config.schedule, ['before 6am on Monday']);
  assert.equal(config.timezone, 'Europe/Berlin');
  assert.ok(config.labels.includes('dependencies'));
  assert.equal(config.rangeStrategy, 'bump');
  assert.equal(config.dependencyDashboard, true);
  assert.equal(config.dependencyDashboardTitle, 'Dependency Dashboard');
  assert.notEqual(config.dependencyDashboardTitle, 'Renovate Dashboard');
  assert.equal(config.semanticCommitType, 'chore');
  assert.equal(config.semanticCommitScope, 'deps');
  assert.deepEqual(config.vulnerabilityAlerts, {
    enabled: true,
    labels: ['security'],
  });

  const requiredExtends = [
    'config:recommended',
    'group:monorepos',
    'group:recommended',
    ':semanticCommits',
  ];

  for (const preset of requiredExtends) {
    assert.ok(config.extends.includes(preset), `Missing extends preset: ${preset}`);
  }
});

test('renovate.json groups package ecosystems and automerges dev patches only', async () => {
  const config = await readJson('renovate.json');
  const packageRules = new Map(config.packageRules.map((rule) => [rule.description, rule]));
  const matchesAnyPattern = (patterns, packageName) =>
    patterns.some((pattern) => new RegExp(pattern).test(packageName));

  const devPatchRule = packageRules.get('Auto-merge dev dependency patches');
  assert.ok(devPatchRule, 'Missing dev dependency patch auto-merge rule');
  assert.deepEqual(devPatchRule.matchDepTypes, ['devDependencies']);
  assert.deepEqual(devPatchRule.matchUpdateTypes, ['patch']);
  assert.equal(devPatchRule.automerge, true);
  assert.equal(devPatchRule.automergeType, 'pr');
  assert.equal(devPatchRule.platformAutomerge, false);
  assert.equal(devPatchRule.ignoreTests, false);

  const groupExpectations = [
    [
      'Group all Svelte packages',
      'Svelte packages',
      ['svelte', '^@sveltejs\\/'],
      [
        'svelte',
        '@sveltejs/kit',
        'eslint-plugin-svelte',
        'prettier-plugin-svelte',
        'svelte-eslint-parser',
        'svelte-check',
      ],
    ],
    [
      'Group all Fastify packages',
      'Fastify packages',
      ['fastify', '^@fastify\\/'],
      ['fastify', '@fastify/helmet', 'fastify-plugin'],
    ],
    [
      'Group all testing packages',
      'Testing packages',
      ['vitest', '^@testing-library\\/', 'playwright', '^@playwright\\/'],
      [
        'vitest',
        '@vitest/coverage-v8',
        '@testing-library/svelte',
        'playwright',
        '@playwright/test',
        '@axe-core/playwright',
      ],
    ],
    [
      'Group all Drizzle packages',
      'Drizzle packages',
      ['^drizzle-'],
      ['drizzle-orm', 'drizzle-kit'],
    ],
  ];

  for (const [description, groupName, matchPackagePatterns, expectedMatches] of groupExpectations) {
    const rule = packageRules.get(description);
    assert.ok(rule, `Missing package group rule: ${description}`);
    assert.equal(rule.groupName, groupName);
    assert.deepEqual(rule.matchPackagePatterns, matchPackagePatterns);
    assert.equal(rule.matchPackageNames, undefined);

    for (const packageName of expectedMatches) {
      assert.equal(
        matchesAnyPattern(rule.matchPackagePatterns, packageName),
        true,
        `${description} must match "${packageName}"`,
      );
    }
  }
});

test('renovate workflow runs on Monday before 6am Berlin and supports manual dispatch', async () => {
  const workflow = await readText('.github/workflows/renovate.yml');

  assert.match(workflow, /name:\s*Renovate/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cron:\s*'0 3 \* \* 1'/);
  assert.doesNotMatch(workflow, /repository_vulnerability_alert:/);
  assert.match(workflow, /uses:\s*actions\/checkout@v4/);
  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /pull-requests:\s*write/);
  assert.match(workflow, /issues:\s*write/);
});

test('renovate workflow uses renovatebot action with repository config and token fallback', async () => {
  const workflow = await readText('.github/workflows/renovate.yml');

  assert.match(workflow, /uses:\s*renovatebot\/github-action@v43/);
  assert.match(workflow, /configurationFile:\s*renovate\.json/);
  assert.match(workflow, /token:\s*\${{\s*secrets\.RENOVATE_TOKEN\s*\|\|\s*github\.token\s*}}/);
  assert.doesNotMatch(workflow, /secrets\.GITHUB_TOKEN/);
});
