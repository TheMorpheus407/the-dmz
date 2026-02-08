import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = async (relativePath) => {
  const filePath = path.join(ROOT_DIR, relativePath);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

test('VS Code workspace settings include required defaults', async () => {
  const settings = await readJson('.vscode/settings.json');

  assert.equal(settings['editor.formatOnSave'], true);
  assert.equal(settings['editor.defaultFormatter'], 'esbenp.prettier-vscode');
  assert.deepEqual(settings['editor.codeActionsOnSave'], {
    'source.fixAll.eslint': 'explicit',
  });
  assert.equal(settings['typescript.tsdk'], 'apps/web/node_modules/typescript/lib');
  assert.equal(settings['typescript.enablePromptUseWorkspaceTsdk'], true);
  assert.equal(settings['svelte.enable-ts-plugin'], true);
  assert.equal(settings['files.eol'], '\n');
  assert.deepEqual(settings['search.exclude'], {
    '**/node_modules': true,
    '**/.svelte-kit': true,
    '**/dist': true,
    '**/.turbo': true,
  });
  assert.equal(settings['eslint.experimental.useFlatConfig'], true);
  assert.ok(Array.isArray(settings['eslint.validate']));

  const workspaceTsdkPath = path.join(ROOT_DIR, settings['typescript.tsdk']);
  await assert.doesNotReject(() => access(workspaceTsdkPath));
});

test('VS Code extension recommendations include the full issue set', async () => {
  const extensions = await readJson('.vscode/extensions.json');

  const expectedRecommendations = [
    'svelte.svelte-vscode',
    'esbenp.prettier-vscode',
    'dbaeumer.vscode-eslint',
    'ms-playwright.playwright',
    'mtxr.sqltools',
    'mtxr.sqltools-driver-pg',
    'bradlc.vscode-tailwindcss',
    'vitest.explorer',
  ];

  for (const extension of expectedRecommendations) {
    assert.ok(
      extensions.recommendations.includes(extension),
      `Missing extension recommendation: ${extension}`,
    );
  }
});

test('VS Code launch configuration includes required debug profiles', async () => {
  const launch = await readJson('.vscode/launch.json');

  const configByName = new Map(launch.configurations.map((config) => [config.name, config]));
  const requiredConfigs = [
    'Debug SvelteKit (frontend)',
    'Debug Fastify (backend)',
    'Debug Vitest (current file)',
    'Debug Playwright (current file, headed)',
  ];

  for (const configName of requiredConfigs) {
    assert.ok(configByName.has(configName), `Missing launch config: ${configName}`);
  }

  assert.equal(configByName.get('Debug Fastify (backend)').request, 'attach');

  const startBackend = configByName.get('Start Fastify with Inspector');
  assert.ok(startBackend, 'Missing helper launch config: Start Fastify with Inspector');
  assert.match(startBackend.command, /--inspect/);

  const debugVitest = configByName.get('Debug Vitest (current file)');
  assert.equal(debugVitest.command, 'node scripts/debug-vitest-current.mjs "${relativeFile}"');

  const compoundsByName = new Map(launch.compounds.map((compound) => [compound.name, compound]));
  const debugBoth = compoundsByName.get('Debug Both (frontend + backend)');

  assert.ok(debugBoth, 'Missing compound launch config: Debug Both (frontend + backend)');
  assert.ok(
    debugBoth.configurations.includes('Debug SvelteKit (frontend)'),
    'Debug Both compound must include frontend debug',
  );
  assert.ok(
    debugBoth.configurations.includes('Debug Fastify (backend)'),
    'Debug Both compound must include backend debug',
  );
});
