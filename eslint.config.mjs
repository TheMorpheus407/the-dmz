import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import importX from 'eslint-plugin-import-x';
import prettierConfig from 'eslint-config-prettier';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isCI = Boolean(process.env.CI);
const unusedVarsLevel = isCI ? 'error' : 'warn';

const tsconfigProjects = [
  path.join(rootDir, 'apps', 'api', 'tsconfig.json'),
  path.join(rootDir, 'apps', 'web', 'tsconfig.json'),
  path.join(rootDir, 'packages', 'shared', 'tsconfig.json'),
  path.join(rootDir, 'packages', 'shared', 'tsconfig.esm.json'),
  path.join(rootDir, 'packages', 'shared', 'tsconfig.cjs.json'),
];

const importResolverSettings = {
  'import-x/resolver': {
    typescript: {
      project: tsconfigProjects,
      tsconfigRootDir: rootDir,
    },
    node: {
      extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.d.ts', '.svelte'],
    },
  },
};

const buildModuleBoundaryZones = () => {
  const modulesRoot = path.join(rootDir, 'apps', 'api', 'src', 'modules');
  if (!fs.existsSync(modulesRoot)) {
    return [];
  }

  const moduleNames = fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const zones = [];
  for (const target of moduleNames) {
    for (const from of moduleNames) {
      if (from === target) {
        continue;
      }
      zones.push({
        target: path.join(modulesRoot, target),
        from: path.join(modulesRoot, from),
        except: [
          path.join(modulesRoot, target, 'index.ts'),
          path.join(modulesRoot, target, 'index.js'),
        ],
      });
    }
  }

  return zones;
};

const moduleBoundaryZones = buildModuleBoundaryZones();

const importOrderRule = [
  'error',
  {
    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
    pathGroups: [
      { pattern: '@the-dmz/**', group: 'internal' },
      { pattern: '$lib/**', group: 'internal' },
      { pattern: '$api/**', group: 'internal' },
      { pattern: '$ui/**', group: 'internal' },
      { pattern: '$stores/**', group: 'internal' },
      { pattern: '$utils/**', group: 'internal' },
      { pattern: '$game/**', group: 'internal' },
    ],
    pathGroupsExcludedImportTypes: ['builtin'],
    'newlines-between': 'always',
  },
];

const mergeConfigRules = (configs) =>
  configs.reduce((acc, config) => (config?.rules ? { ...acc, ...config.rules } : acc), {});

const svelteRecommendedRules = mergeConfigRules(sveltePlugin.configs['flat/recommended']);

const svelteA11yRules = {
  'svelte/button-has-type': 'error',
  'svelte/no-target-blank': 'error',
};

const baseRules = {
  ...js.configs.recommended.rules,
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'prefer-const': 'error',
  'consistent-return': 'error',
  'import-x/no-cycle': 'error',
  'import-x/no-duplicates': 'error',
  'import-x/order': importOrderRule,
  ...(moduleBoundaryZones.length > 0
    ? {
        'import-x/no-restricted-paths': [
          'error',
          {
            zones: moduleBoundaryZones,
            basePath: rootDir,
          },
        ],
      }
    : {}),
};

const nonTypeAwareRules = {
  ...tsPlugin.configs.recommended.rules,
  '@typescript-eslint/no-redeclare': 'off',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/no-unused-vars': [
    unusedVarsLevel,
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  'no-unused-vars': 'off',
  'no-undef': 'off',
  'no-redeclare': 'off',
};

const typeAwareRules = {
  ...tsPlugin.configs['recommended-type-checked'].rules,
  '@typescript-eslint/no-redeclare': 'off',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-return': 'error',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/no-unused-vars': [
    unusedVarsLevel,
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  'no-unused-vars': 'off',
  'no-undef': 'off',
  'no-redeclare': 'off',
  'consistent-return': 'off',
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/node_modules/**',
    ],
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      'import-x': importX,
    },
    settings: importResolverSettings,
    rules: baseRules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'apps/api/drizzle.config.ts',
      'apps/api/vitest.config.ts',
      'apps/web/vitest.config.ts',
      'packages/shared/vitest.config.ts',
      'vitest.workspace.ts',
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      'packages/shared/scripts/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'import-x': importX,
    },
    settings: importResolverSettings,
    rules: {
      ...baseRules,
      ...typeAwareRules,
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      'packages/shared/scripts/**/*.{ts,tsx}',
      'apps/api/vitest.config.ts',
      'apps/web/vitest.config.ts',
      'packages/shared/vitest.config.ts',
      'vitest.workspace.ts',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'import-x': importX,
    },
    settings: importResolverSettings,
    rules: {
      ...baseRules,
      ...nonTypeAwareRules,
    },
  },
  {
    files: ['apps/api/drizzle.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'import-x': importX,
    },
    settings: importResolverSettings,
    rules: {
      ...baseRules,
      ...nonTypeAwareRules,
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.svelte'],
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
    plugins: {
      svelte: sveltePlugin,
      '@typescript-eslint': tsPlugin,
      'import-x': importX,
    },
    settings: importResolverSettings,
    processor: 'svelte/svelte',
    rules: {
      ...baseRules,
      ...typeAwareRules,
      ...svelteRecommendedRules,
      ...svelteA11yRules,
    },
  },
  {
    files: [
      '**/*.test.{js,cjs,mjs,ts,tsx}',
      '**/__tests__/**/*.{js,cjs,mjs,ts,tsx}',
      '**/scripts/**/*.{js,cjs,mjs,ts,tsx}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  prettierConfig,
];
