#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      cwd: rootDir,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  console.log('🔒 Running M1 Frontend Contract Gate...\n');

  try {
    console.log('--- Checking for default exports ---');
    await runScript(path.join(rootDir, 'scripts/check-default-exports.mjs'));

    console.log('\n--- Checking for legacy Svelte patterns ---');
    await runScript(path.join(rootDir, 'scripts/check-svelte-legacy.mjs'));

    console.log('\n✅ All contract checks PASSED');
    process.exit(0);
  } catch {
    console.log('\n❌ Contract gate FAILED');
    process.exit(1);
  }
}

main();
