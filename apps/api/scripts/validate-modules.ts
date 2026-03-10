import * as fs from 'fs';
import * as path from 'path';

import { validateManifest, getRegistrationOrder } from '../src/modules/bootstrap.js';
import { MODULE_MANIFEST, getAllModuleNames } from '../src/modules/manifest.js';

const MODULE_NAME_BY_DIRECTORY = new Map(
  MODULE_MANIFEST.modules.map((entry) => [
    entry.pluginPath.replace('./modules/', '').split('/')[0] ?? entry.name,
    entry.name,
  ]),
);

function checkModuleDirectories(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const manifestModuleNames = getAllModuleNames();
  const modulesRoot = path.join(process.cwd(), 'src/modules');

  if (!fs.existsSync(modulesRoot)) {
    return { valid: true, errors };
  }

  const moduleDirs = fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith('__') && entry.name !== 'routes',
    )
    .map((entry) => entry.name);

  for (const dirName of moduleDirs) {
    const fullPath = path.join(modulesRoot, dirName);
    const indexFiles = fs
      .readdirSync(fullPath)
      .filter((file) => file === 'index.ts' || file.endsWith('.plugin.ts'));

    if (indexFiles.length === 0) {
      continue;
    }

    const manifestName = MODULE_NAME_BY_DIRECTORY.get(dirName) ?? dirName;
    if (!manifestModuleNames.includes(manifestName)) {
      errors.push(
        `Module directory 'src/modules/${dirName}' exists but is not represented in manifest`,
      );
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
