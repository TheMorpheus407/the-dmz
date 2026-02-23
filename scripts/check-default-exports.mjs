#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const scopedPaths = [
  path.join(rootDir, 'apps/web/src/lib'),
  path.join(rootDir, 'packages/shared/src'),
];

const exceptionPatterns = [
  /\.stories\.ts$/,
  /\.test\.ts$/,
  /\.generated\.ts$/,
  /json-schemas\.generated\.ts$/,
  /\/__tests__\//,
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

function checkForDefaultExports(filePath) {
  if (isException(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'export default' || line.startsWith('export default ')) {
      violations.push({
        line: i + 1,
        content: lines[i],
      });
    }
  }

  return violations;
}

let hasError = false;

console.log('🔍 Checking for default exports in scoped source paths...\n');

for (const scopedPath of scopedPaths) {
  const relativePath = path.relative(rootDir, scopedPath);
  console.log(`📁 Checking ${relativePath}/...`);

  const files = findFiles(scopedPath, ['.ts']);

  for (const file of files) {
    const violations = checkForDefaultExports(file);
    if (violations.length > 0) {
      hasError = true;
      const fileRelativePath = path.relative(rootDir, file);
      console.log(`\n  ❌ ${fileRelativePath}`);
      for (const v of violations) {
        console.log(`     Line ${v.line}: ${v.content}`);
      }
    }
  }
}

console.log('');

if (hasError) {
  console.log('❌ Contract gate FAILED: Default exports found in scoped source paths');
  console.log('\nAllowed exceptions: *.stories.ts, *.test.ts, __tests__/**, *.generated.ts');
  process.exit(1);
} else {
  console.log('✅ Contract gate PASSED: No default exports in scoped source paths');
  process.exit(0);
}
