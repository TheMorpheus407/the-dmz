import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_PRIMITIVES = ['Button', 'Panel', 'Badge', 'Tabs', 'Modal', 'LoadingState'];

const STORY_STATE_REQUIREMENTS = {
  Button: ['Primary', 'Secondary', 'Danger', 'Ghost', 'Small', 'Large', 'Disabled'],
  Panel: ['Default', 'Elevated', 'Outlined', 'Highlight'],
  Badge: ['Default', 'Success', 'Warning', 'Danger', 'Info', 'Small'],
  Tabs: ['Default', 'WithDisabledTab', 'KeyboardNavigation', 'LongContent'],
  Modal: ['Default', 'Small', 'Large', 'WithFooter', 'FocusTrap', 'NoCloseOnOverlay'],
  LoadingState: ['Spinner', 'Dots', 'Skeleton', 'Small', 'Large', 'NoMessage'],
};

const STORIES_DIR = path.resolve(__dirname, '../apps/web/src/lib/ui/components/__stories__');
const COMPONENTS_DIR = path.resolve(__dirname, '../apps/web/src/lib/ui/components');

function validatePrimitive(primitive) {
  const storyPath = path.join(STORIES_DIR, `${primitive}.stories.ts`);
  const componentPath = path.join(COMPONENTS_DIR, `${primitive}.svelte`);

  const storyExists = fs.existsSync(storyPath);
  const componentExists = fs.existsSync(componentPath);

  const errors = [];

  if (!componentExists) {
    errors.push(`Component file not found: ${componentPath}`);
  }

  if (!storyExists) {
    errors.push(`Story file not found: ${storyPath}`);
  }

  let storyStates = [];

  if (storyExists) {
    const storyContent = fs.readFileSync(storyPath, 'utf-8');
    const exportMatches = storyContent.match(/export const (\w+): Story/g);

    if (exportMatches) {
      storyStates = exportMatches.map((match) =>
        match.replace('export const ', '').replace(': Story', ''),
      );
    }
  }

  const requiredStates = STORY_STATE_REQUIREMENTS[primitive] || [];
  const missingStates = requiredStates.filter((state) => !storyStates.includes(state));

  if (storyExists && missingStates.length > 0) {
    errors.push(`Missing story states: ${missingStates.join(', ')}`);
  }

  return {
    primitive,
    storyExists,
    componentExists,
    storyStates,
    requiredStates,
    missingStates,
    errors,
  };
}

function main() {
  console.log('🔍 Primitive Catalog Parity Check\n');
  console.log('='.repeat(60));

  const results = [];
  let hasErrors = false;

  for (const primitive of REQUIRED_PRIMITIVES) {
    const result = validatePrimitive(primitive);
    results.push(result);

    if (result.errors.length > 0 || !result.storyExists || !result.componentExists) {
      hasErrors = true;
    }
  }

  for (const result of results) {
    console.log(`\n📦 ${result.primitive}`);
    console.log('-'.repeat(40));
    console.log(`  Component: ${result.componentExists ? '✅' : '❌'}`);
    console.log(`  Story: ${result.storyExists ? '✅' : '❌'}`);

    if (result.storyExists) {
      console.log(`  Story states: ${result.storyStates.join(', ') || 'none'}`);
      console.log(`  Required states: ${result.requiredStates.join(', ')}`);

      if (result.missingStates.length > 0) {
        console.log(`  Missing states: ${result.missingStates.join(', ')}`);
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
    console.log('Primitive contract has inconsistencies. Fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL PRIMITIVES VALIDATED');
    console.log('Catalog and runtime exports are in sync.');
    process.exit(0);
  }
}

main();
