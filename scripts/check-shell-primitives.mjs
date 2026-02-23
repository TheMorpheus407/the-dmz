import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHELL_PRIMITIVE_REQUIREMENTS = {
  '(game)': {
    primitives: ['Button', 'LoadingState', 'Drawer'],
    file: 'src/routes/(game)/+layout.svelte',
  },
  '(admin)': {
    primitives: ['Button', 'LoadingState', 'Drawer'],
    file: 'src/routes/(admin)/+layout.svelte',
  },
  '(auth)': {
    primitives: ['LoadingState'],
    file: 'src/routes/(auth)/+layout.svelte',
  },
  '(public)': {
    primitives: ['Button', 'LoadingState'],
    file: 'src/routes/(public)/+layout.svelte',
  },
};

const WEB_ROOT = path.resolve(__dirname, '../apps/web');

function validateShell(shell, config) {
  const filePath = path.join(WEB_ROOT, config.file);
  const fileExists = fs.existsSync(filePath);

  const errors = [];

  if (!fileExists) {
    errors.push(`Shell file not found: ${filePath}`);
    return {
      shell,
      filePath,
      fileExists: false,
      requiredPrimitives: [...config.primitives],
      foundImports: [],
      missingPrimitives: [],
      adHocElements: [],
      errors,
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  const importRegex = /import\s+(\w+)\s+from\s+['"]\$lib\/ui\/components\/(\w+)\.svelte['"]/g;
  const foundImports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    foundImports.push(match[1]);
  }

  const missingPrimitives = config.primitives.filter(
    (p) => !foundImports.some((imp) => imp.toLowerCase() === p.toLowerCase()),
  );

  const adHocElements = [];

  const buttonPattern = /<button[^>]*>/gi;
  if (config.primitives.includes('Button') && !foundImports.includes('Button')) {
    const buttonMatches = content.match(buttonPattern);
    if (buttonMatches) {
      adHocElements.push(
        `<button> (${buttonMatches.length} instances - should use Button primitive)`,
      );
    }
  }

  const loadingPattern = /loading|spinner|loader/gi;
  if (config.primitives.includes('LoadingState') && !foundImports.includes('LoadingState')) {
    const hasLoadingMarkup = content.includes('loading=') || content.match(loadingPattern);
    if (hasLoadingMarkup) {
      adHocElements.push('loading indicator (should use LoadingState primitive)');
    }
  }

  if (missingPrimitives.length > 0) {
    errors.push(`Missing required primitive imports: ${missingPrimitives.join(', ')}`);
  }

  if (adHocElements.length > 0) {
    errors.push(`Ad-hoc implementations found: ${adHocElements.join('; ')}`);
  }

  return {
    shell,
    filePath,
    fileExists,
    requiredPrimitives: [...config.primitives],
    foundImports,
    missingPrimitives,
    adHocElements,
    errors,
  };
}

function main() {
  console.log('🔍 Shell Primitive Usage Validation\n');
  console.log('='.repeat(60));

  const results = [];
  let hasErrors = false;

  for (const [shell, config] of Object.entries(SHELL_PRIMITIVE_REQUIREMENTS)) {
    const result = validateShell(shell, config);
    results.push(result);

    if (result.errors.length > 0) {
      hasErrors = true;
    }
  }

  for (const result of results) {
    console.log(`\n🏗️  Shell: ${result.shell}`);
    console.log('-'.repeat(40));
    console.log(`  File: ${result.fileExists ? '✅' : '❌'} ${result.filePath}`);

    if (result.fileExists) {
      console.log(`  Required primitives: ${result.requiredPrimitives.join(', ')}`);
      console.log(`  Found imports: ${result.foundImports.join(', ') || 'none'}`);

      if (result.missingPrimitives.length > 0) {
        console.log(`  ❌ Missing: ${result.missingPrimitives.join(', ')}`);
      }

      if (result.adHocElements.length > 0) {
        console.log(`  ⚠️  Ad-hoc elements:`);
        for (const elem of result.adHocElements) {
          console.log(`     - ${elem}`);
        }
      }
    }

    if (result.errors.length > 0) {
      console.log(`  ❌ Errors:`);
      for (const error of result.errors) {
        console.log(`     - ${error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));

  if (hasErrors) {
    console.log('\n❌ VALIDATION FAILED');
    console.log('Route shells have primitive usage inconsistencies. Fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL SHELLS VALIDATED');
    console.log('Route shells properly use shared primitives.');
    process.exit(0);
  }
}

main();
