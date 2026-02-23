#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const scopedPaths = [
  path.join(rootDir, 'apps/web/src/lib/ui/components'),
  path.join(rootDir, 'apps/web/src/routes'),
  path.join(rootDir, 'apps/web/src/lib/game'),
  path.join(rootDir, 'apps/web/src/lib/admin'),
];

const exceptionPatterns = [/\.test\.svelte$/, /\/__tests__\//];

const legacyPatterns = [
  { regex: /^\s*\$:/, name: '$: reactive statement' },
  { regex: /^\s*export\s+let\s+/, name: 'export let props' },
  { regex: /\$(\w+)\s*=/, name: '$: reactive assignment (deprecated)' },
];

const excludeDirs = ['node_modules', 'dist', 'build', '.svelte-kit'];

function shouldExclude(filePath) {
  return excludeDirs.some((dir) => filePath.includes(dir));
}

function isException(filePath) {
  return exceptionPatterns.some((pattern) => pattern.test(filePath));
}

function findFiles(dir, extensions) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldExclude(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

function checkForLegacyReactivity(filePath) {
  if (isException(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of legacyPatterns) {
      if (pattern.regex.test(line)) {
        violations.push({
          line: i + 1,
          content: line.trim(),
          type: pattern.name,
        });
      }
    }
  }

  return violations;
}

let hasError = false;

console.log('🔍 Checking for legacy Svelte reactivity patterns...\n');

for (const scopedPath of scopedPaths) {
  const relativePath = path.relative(rootDir, scopedPath);
  console.log(`📁 Checking ${relativePath}/...`);

  const files = findFiles(scopedPath, ['.svelte']);

  for (const file of files) {
    const violations = checkForLegacyReactivity(file);
    if (violations.length > 0) {
      hasError = true;
      const fileRelativePath = path.relative(rootDir, file);
      console.log(`\n  ❌ ${fileRelativePath}`);
      for (const v of violations) {
        console.log(`     Line ${v.line}: ${v.type} - ${v.content}`);
      }
    }
  }
}

console.log('');

if (hasError) {
  console.log('❌ Contract gate FAILED: Legacy Svelte reactivity patterns found');
  console.log('\nUse Svelte 5 runes: $state(), $derived(), $effect(), $props()');
  process.exit(1);
} else {
  console.log('✅ Contract gate PASSED: No legacy Svelte reactivity patterns');
  process.exit(0);
}
