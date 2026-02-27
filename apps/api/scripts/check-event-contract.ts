import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { m1AuthEventContracts } from '@the-dmz/shared/contracts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AUTH_EVENTS_FILE = join(__dirname, '..', 'src', 'modules', 'auth', 'auth.events.ts');
const EVENT_TYPES_FILE = join(__dirname, '..', 'src', 'shared', 'events', 'event-types.ts');

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
}

function checkEventContractsExist(): string[] {
  const errors: string[] = [];

  for (const contract of m1AuthEventContracts) {
    const eventTypeParts = contract.eventType.split('.');
    const factoryName =
      'create' +
      eventTypeParts
        .map((part) => {
          const camelCasePart = toCamelCase(part);
          return camelCasePart.charAt(0).toUpperCase() + camelCasePart.slice(1);
        })
        .join('') +
      'Event';

    let foundEventType = false;
    let foundFactory = false;

    const content = readFileSync(AUTH_EVENTS_FILE, 'utf-8');

    const eventTypeRegex = new RegExp(`['"]${contract.eventType}['"]`);
    if (eventTypeRegex.test(content)) {
      foundEventType = true;
    }

    const factoryRegex = new RegExp(`export\\s+const\\s+${factoryName}`);
    if (factoryRegex.test(content)) {
      foundFactory = true;
    }

    if (!foundEventType) {
      errors.push(`Contract missing event type "${contract.eventType}" - expected constant`);
    }

    if (!foundFactory) {
      errors.push(`Contract missing factory for "${contract.eventType}"`);
    }
  }

  return errors;
}

function checkEventPayloads(): string[] {
  const errors: string[] = [];

  const content = readFileSync(AUTH_EVENTS_FILE, 'utf-8');

  const payloadDefinitions: Record<string, { interfaceName: string; fields: string[] }> = {
    'auth.user.created': {
      interfaceName: 'AuthUserCreatedPayload',
      fields: ['userId', 'email', 'tenantId'],
    },
    'auth.user.updated': {
      interfaceName: 'AuthUserUpdatedPayload',
      fields: ['userId', 'email', 'tenantId', 'changes'],
    },
    'auth.user.deactivated': {
      interfaceName: 'AuthUserDeactivatedPayload',
      fields: ['userId', 'email', 'tenantId'],
    },
    'auth.session.created': {
      interfaceName: 'AuthSessionCreatedPayload',
      fields: ['sessionId', 'userId', 'tenantId'],
    },
    'auth.session.revoked': {
      interfaceName: 'AuthSessionRevokedPayload',
      fields: ['sessionId', 'userId', 'tenantId', 'reason'],
    },
    'auth.login.failed': {
      interfaceName: 'AuthLoginFailedPayload',
      fields: ['tenantId', 'email', 'reason', 'correlationId'],
    },
  };

  for (const [eventType, def] of Object.entries(payloadDefinitions)) {
    const interfaceName = def.interfaceName;
    const expectedFields = def.fields;

    const interfaceRegex = new RegExp(`interface\\s+${interfaceName}\\s*\\{([^}]+)\\}`);
    const match = content.match(interfaceRegex);

    if (!match) {
      errors.push(`Missing payload interface for: ${eventType}`);
      continue;
    }

    const body = match[1];
    if (!body) {
      errors.push(`Missing payload interface for: ${eventType}`);
      continue;
    }

    for (const field of expectedFields) {
      const fieldRegex = new RegExp(`\\b${field}\\s*[:?]`);
      if (!fieldRegex.test(body)) {
        errors.push(`Missing required payload field in ${eventType}: ${field}`);
      }
    }
  }

  return errors;
}

function checkMetadataFields(): string[] {
  const errors: string[] = [];

  if (!existsSync(EVENT_TYPES_FILE)) {
    errors.push('DomainEvent interface file not found');
    return errors;
  }

  const content = readFileSync(EVENT_TYPES_FILE, 'utf-8');

  const requiredMetadata = [
    'eventId',
    'eventType',
    'timestamp',
    'correlationId',
    'tenantId',
    'userId',
    'source',
    'version',
  ];

  for (const field of requiredMetadata) {
    const fieldRegex = new RegExp(`\\b${field}\\s*[:?]`);
    if (!fieldRegex.test(content)) {
      errors.push(`Missing required metadata field in DomainEvent: ${field}`);
    }
  }

  return errors;
}

async function runEventContractCheck(): Promise<void> {
  console.log('Running M1 Auth Event Contract Check...\n');

  const allErrors: string[] = [];

  console.log('[1/4] Checking auth events file exists...');
  if (!existsSync(AUTH_EVENTS_FILE)) {
    console.error('  ❌ Auth events file not found');
    process.exit(1);
  }
  console.log('  ✅ Auth events file found\n');

  console.log('[2/4] Checking event contracts are defined...');
  const contractErrors = checkEventContractsExist();
  allErrors.push(...contractErrors);
  if (contractErrors.length > 0) {
    for (const error of contractErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ All M1 event contracts defined');
  }
  console.log('');

  console.log('[3/4] Checking payload definitions...');
  const payloadErrors = checkEventPayloads();
  allErrors.push(...payloadErrors);
  if (payloadErrors.length > 0) {
    for (const error of payloadErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ All payload definitions match contracts');
  }
  console.log('');

  console.log('[4/4] Checking DomainEvent metadata fields...');
  const metadataErrors = checkMetadataFields();
  allErrors.push(...metadataErrors);
  if (metadataErrors.length > 0) {
    for (const error of metadataErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ DomainEvent metadata fields complete');
  }
  console.log('');

  console.log('='.repeat(50));

  if (allErrors.length > 0) {
    console.error(`\n❌ FAILED: ${allErrors.length} error(s) found`);
    console.log('\nEvent contract drift detected. Run tests for more details:');
    console.log('  pnpm --filter api test -- --run event-contract-parity');
    console.log('  pnpm --filter api test -- --run sensitive-data-exclusion');
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All event contract checks passed');
    process.exit(0);
  }
}

runEventContractCheck().catch((err) => {
  console.error('Event contract check failed:', err);
  process.exit(1);
});
