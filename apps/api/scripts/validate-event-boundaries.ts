import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SENSITIVE_PAYLOAD_FIELDS, REQUIRED_METADATA_FIELDS } from '@the-dmz/shared/contracts';

import {
  EVENT_OWNERSHIP_MANIFEST,
  getEventOwnership,
} from '../src/shared/events/ownership-manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

const MODULE_DIRS = ['auth', 'game', 'health'];

interface ValidationError {
  category: 'ownership' | 'metadata' | 'sensitive' | 'version' | 'duplicate';
  message: string;
  file?: string;
  line?: number;
}

function validateOwnershipBoundaries(
  moduleEvents: Map<string, { path: string; events: string[] }>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [moduleName, { path, events }] of moduleEvents) {
    for (const eventType of events) {
      const ownership = getEventOwnership(eventType);

      if (!ownership) {
        errors.push({
          category: 'ownership',
          message: `Unregistered event type "${eventType}" in module "${moduleName}" - must be added to ownership manifest`,
          file: path,
        });
        continue;
      }

      if (ownership.owningModule !== moduleName) {
        const hasExemption = ownership.exemptions?.some((e) => e.module === moduleName) ?? false;

        if (!hasExemption) {
          errors.push({
            category: 'ownership',
            message: `Module "${moduleName}" emits event "${eventType}" owned by "${ownership.owningModule}" without exemption`,
            file: path,
          });
        }
      }
    }
  }

  return errors;
}

function validateMetadataContracts(): ValidationError[] {
  const errors: ValidationError[] = [];

  const eventTypesFile = join(__dirname, '..', 'src', 'shared', 'events', 'event-types.ts');
  if (!existsSync(eventTypesFile)) {
    errors.push({
      category: 'metadata',
      message: 'DomainEvent interface file not found',
    });
    return errors;
  }

  const eventTypesContent = readFileSync(eventTypesFile, 'utf-8');

  for (const field of REQUIRED_METADATA_FIELDS) {
    const fieldRegex = new RegExp(`\\b${field}\\s*[:?]`);
    if (!fieldRegex.test(eventTypesContent)) {
      errors.push({
        category: 'metadata',
        message: `Required metadata field "${field}" missing from DomainEvent interface`,
        file: eventTypesFile,
      });
    }
  }

  return errors;
}

function validateSensitiveDataExclusion(
  moduleEvents: Map<string, { path: string; events: string[] }>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [_moduleName, { path, events }] of moduleEvents) {
    const content = readFileSync(path, 'utf-8');

    for (const eventType of events) {
      const ownership = getEventOwnership(eventType);
      if (!ownership) continue;

      const parts = eventType.split('.');
      const eventName = parts[1];
      if (!eventName) continue;

      const payloadInterfaceMatch = content.match(
        new RegExp(
          `interface\\s+(\\w*${eventName.charAt(0).toUpperCase() + eventName.slice(1)}.*)Payload[^}]*\\{([^}]+)\\}`,
        ),
      );

      if (payloadInterfaceMatch && payloadInterfaceMatch[2]) {
        const payloadBody = payloadInterfaceMatch[2];
        for (const sensitiveField of SENSITIVE_PAYLOAD_FIELDS) {
          const fieldRegex = new RegExp(`\\b${sensitiveField}\\s*[:?]`);
          if (fieldRegex.test(payloadBody)) {
            errors.push({
              category: 'sensitive',
              message: `Forbidden sensitive field "${sensitiveField}" found in "${eventType}" payload`,
              file: path,
            });
          }
        }
      }
    }
  }

  return errors;
}

function validateVersionPolicy(): ValidationError[] {
  const errors: ValidationError[] = [];

  const policy = EVENT_OWNERSHIP_MANIFEST.versionPolicy;

  if (!['additive', 'minor', 'major'].includes(policy.allowedChanges)) {
    errors.push({
      category: 'version',
      message: `Invalid version policy: "${policy.allowedChanges}". Must be one of: additive, minor, major`,
    });
  }

  return errors;
}

function validateDuplicateEventDefinitions(
  moduleEvents: Map<string, { path: string; events: string[] }>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const eventToModules = new Map<string, string[]>();

  for (const [moduleName, { events }] of moduleEvents) {
    for (const eventType of events) {
      const existing = eventToModules.get(eventType) || [];
      existing.push(moduleName);
      eventToModules.set(eventType, existing);
    }
  }

  for (const [eventType, modules] of eventToModules) {
    if (modules.length > 1) {
      errors.push({
        category: 'duplicate',
        message: `Event type "${eventType}" defined in multiple modules: ${modules.join(', ')}`,
      });
    }
  }

  return errors;
}

function printErrors(errors: ValidationError[]): void {
  const byCategory: Record<string, ValidationError[]> = {};
  for (const error of errors) {
    const category = error.category;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(error);
  }

  for (const [category, categoryErrors] of Object.entries(byCategory)) {
    console.log(`\n[${category.toUpperCase()}]`);
    for (const error of categoryErrors) {
      const location = error.file ? ` (${error.file})` : '';
      console.log(`  ❌ ${error.message}${location}`);
    }
  }
}

function findEventModules(): Map<string, { path: string; events: string[] }> {
  const moduleEvents = new Map<string, { path: string; events: string[] }>();

  for (const moduleName of MODULE_DIRS) {
    const modulePath = join(MODULES_DIR, moduleName);
    if (!existsSync(modulePath)) continue;

    const files = readdirSync(modulePath).filter((f) => f.endsWith('.events.ts'));

    for (const file of files) {
      const fullPath = join(modulePath, file);
      const content = readFileSync(fullPath, 'utf-8');
      const events: string[] = [];

      const eventMatches = content.matchAll(/['"]([a-z]+\.[a-z.]+)['"]/g);
      for (const match of eventMatches) {
        const eventType = match[1];
        if (eventType && eventType.includes('.') && eventType.split('.').length >= 2) {
          events.push(eventType);
        }
      }

      if (events.length > 0) {
        moduleEvents.set(moduleName, { path: fullPath, events: [...new Set(events)] });
      }
    }
  }

  return moduleEvents;
}

async function runValidation(): Promise<void> {
  console.log('Running Event Boundary Validation...\n');
  console.log('='.repeat(50));

  const allErrors: ValidationError[] = [];

  console.log('\n[1/5] Scanning for event definitions...');
  const moduleEvents = findEventModules();
  console.log(`  Found events in ${moduleEvents.size} modules`);

  console.log('\n[2/5] Validating ownership boundaries...');
  const ownershipErrors = validateOwnershipBoundaries(moduleEvents);
  allErrors.push(...ownershipErrors);
  if (ownershipErrors.length > 0) {
    console.log(`  ❌ ${ownershipErrors.length} ownership violation(s)`);
  } else {
    console.log('  ✅ All events comply with ownership boundaries');
  }

  console.log('\n[3/5] Validating metadata contracts...');
  const metadataErrors = validateMetadataContracts();
  allErrors.push(...metadataErrors);
  if (metadataErrors.length > 0) {
    console.log(`  ❌ ${metadataErrors.length} metadata violation(s)`);
  } else {
    console.log('  ✅ All events have required metadata fields');
  }

  console.log('\n[4/5] Validating sensitive data exclusion...');
  const sensitiveErrors = validateSensitiveDataExclusion(moduleEvents);
  allErrors.push(...sensitiveErrors);
  if (sensitiveErrors.length > 0) {
    console.log(`  ❌ ${sensitiveErrors.length} sensitive data violation(s)`);
  } else {
    console.log('  ✅ No forbidden sensitive fields in event payloads');
  }

  console.log('\n[5/5] Validating version policy...');
  const versionErrors = validateVersionPolicy();
  allErrors.push(...versionErrors);
  if (versionErrors.length > 0) {
    console.log(`  ❌ ${versionErrors.length} version policy violation(s)`);
  } else {
    console.log('  ✅ Version policy is valid');
  }

  console.log('\n[6/6] Checking for duplicate event definitions...');
  const duplicateErrors = validateDuplicateEventDefinitions(moduleEvents);
  allErrors.push(...duplicateErrors);
  if (duplicateErrors.length > 0) {
    console.log(`  ❌ ${duplicateErrors.length} duplicate definition(s)`);
  } else {
    console.log('  ✅ No duplicate event definitions');
  }

  console.log('\n' + '='.repeat(50));

  if (allErrors.length > 0) {
    console.error(`\n❌ FAILED: ${allErrors.length} error(s) found\n`);
    printErrors(allErrors);
    console.log('\nTo fix: Update the ownership manifest or event definitions');
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All event boundary checks passed');
    process.exit(0);
  }
}

runValidation().catch((err) => {
  console.error('Event boundary validation failed:', err);
  process.exit(1);
});
