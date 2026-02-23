import * as fs from 'fs';
import * as path from 'path';

import { validateManifest, getRegistrationOrder } from '../src/modules/bootstrap.js';
import { getAllModuleNames } from '../src/modules/manifest.js';

const MODULE_DIRS = ['src/modules/auth', 'src/modules/game', 'src/modules/health'];

function checkModuleDirectories(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const manifestModuleNames = getAllModuleNames();

  for (const dir of MODULE_DIRS) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      const indexFiles = fs
        .readdirSync(fullPath)
        .filter((f) => f === 'index.ts' || f.endsWith('.plugin.ts'));
      if (indexFiles.length > 0) {
        const dirName = dir.replace('src/modules/', '');
        if (!manifestModuleNames.includes(dirName)) {
          errors.push(`Module directory '${dir}' exists but is not represented in manifest`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function main() {
  console.log('Validating module manifest...\n');

  const validation = validateManifest();
  if (!validation.valid) {
    console.log('ERROR: Manifest validation failed:\n');
    for (const error of validation.errors) {
      console.log(`  [${error.type}] ${error.message}`);
    }
    process.exit(1);
  }

  console.log('Manifest validation: PASSED\n');

  const dirCheck = checkModuleDirectories();
  if (!dirCheck.valid) {
    console.log('WARNING: Module directory check:\n');
    for (const error of dirCheck.errors) {
      console.log(`  ${error}`);
    }
  }

  console.log('Registration order (topological sort):');
  const order = getRegistrationOrder();
  for (const entry of order) {
    const deps =
      entry.dependencies.length > 0 ? ` [depends on: ${entry.dependencies.join(', ')}]` : '';
    console.log(`  ${entry.name}${deps}`);
  }

  console.log('\nModule integrity check: PASSED');
  process.exit(0);
}

main();
