import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { m1LoggingContractManifest, requiredRequestLogFields } from '@the-dmz/shared/contracts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUEST_LOGGER_FILE = join(
  __dirname,
  '..',
  'src',
  'shared',
  'middleware',
  'request-logger.ts',
);
const APP_FILE = join(__dirname, '..', 'src', 'app.ts');
const ERROR_HANDLER_FILE = join(__dirname, '..', 'src', 'shared', 'middleware', 'error-handler.ts');

function checkRequestLoggerExists(): string[] {
  const errors: string[] = [];

  if (!existsSync(REQUEST_LOGGER_FILE)) {
    errors.push('Request logger middleware file not found');
    return errors;
  }

  const content = readFileSync(REQUEST_LOGGER_FILE, 'utf-8');

  const requiredEvents = ['request_received', 'request_completed'];
  for (const event of requiredEvents) {
    const eventRegex = new RegExp(`['"]${event}['"]`);
    if (!eventRegex.test(content)) {
      errors.push(`Missing required event type: "${event}"`);
    }
  }

  const requiredFields = [...requiredRequestLogFields];
  for (const field of requiredFields) {
    const fieldRegex = new RegExp(`\\b${field}\\b`);
    if (!fieldRegex.test(content)) {
      errors.push(`Missing required field in request logger: "${field}"`);
    }
  }

  return errors;
}

function checkLevelSemantics(): string[] {
  const errors: string[] = [];

  if (!existsSync(REQUEST_LOGGER_FILE)) {
    errors.push('Request logger file not found');
    return errors;
  }

  const content = readFileSync(REQUEST_LOGGER_FILE, 'utf-8');

  const warnCheckRegex = /statusCode\s*>=\s*400/;
  if (!warnCheckRegex.test(content)) {
    errors.push('Missing 4xx -> warn level mapping');
  }

  const errorCheckRegex = /statusCode\s*>=\s*500/;
  if (!errorCheckRegex.test(content)) {
    errors.push('Missing 5xx -> error level mapping');
  }

  return errors;
}

function checkRedactionConfig(): string[] {
  const errors: string[] = [];

  if (!existsSync(APP_FILE)) {
    errors.push('App file not found');
    return errors;
  }

  const content = readFileSync(APP_FILE, 'utf-8');

  const redactSectionRegex = /redact:\s*\{/;
  if (!redactSectionRegex.test(content)) {
    errors.push('Missing redact configuration in app.ts');
    return errors;
  }

  const pathsSectionRegex = /paths:\s*\[/;
  if (!pathsSectionRegex.test(content)) {
    errors.push('Missing redact paths array in app.ts');
  }

  const criticalRedactionKeys = ['authorization', 'cookie', 'password', 'token', 'mfaCode'];
  for (const key of criticalRedactionKeys) {
    const keyRegex = new RegExp(`'req\\.headers\\.${key}'|'req\\.body\\.${key}'`);
    if (!keyRegex.test(content)) {
      errors.push(`Missing redaction path for key: "${key}"`);
    }
  }

  return errors;
}

function checkErrorHandlerCorrelation(): string[] {
  const errors: string[] = [];

  if (!existsSync(ERROR_HANDLER_FILE)) {
    errors.push('Error handler file not found');
    return errors;
  }

  const content = readFileSync(ERROR_HANDLER_FILE, 'utf-8');

  const requestIdRegex = /requestId.*request\.id|request\.id.*requestId/;
  if (!requestIdRegex.test(content)) {
    errors.push('Missing requestId correlation in error handler');
  }

  const tenantIdRegex = /tenantId.*request\.tenantContext/;
  if (!tenantIdRegex.test(content)) {
    errors.push('Missing tenantId correlation in error handler');
  }

  const userIdRegex = /userId.*request\.tenantContext/;
  if (!userIdRegex.test(content)) {
    errors.push('Missing userId correlation in error handler');
  }

  return errors;
}

function checkServiceMetadata(): string[] {
  const errors: string[] = [];

  if (!existsSync(REQUEST_LOGGER_FILE)) {
    return errors;
  }

  const content = readFileSync(REQUEST_LOGGER_FILE, 'utf-8');

  const serviceMeta = m1LoggingContractManifest.serviceMetadata;

  if (!content.includes(serviceMeta.name)) {
    errors.push(`Missing service name: "${serviceMeta.name}"`);
  }

  if (!content.includes(serviceMeta.environmentKey)) {
    errors.push(`Missing service ${serviceMeta.environmentKey} field`);
  }

  if (!content.includes(serviceMeta.versionKey)) {
    errors.push(`Missing service ${serviceMeta.versionKey} field`);
  }

  return errors;
}

async function runLoggingContractCheck(): Promise<void> {
  console.log('Running M1 Logging Contract Check...\n');

  const allErrors: string[] = [];

  console.log('[1/6] Checking request logger file exists...');
  if (!existsSync(REQUEST_LOGGER_FILE)) {
    console.error('  ❌ Request logger file not found');
    process.exit(1);
  }
  console.log('  ✅ Request logger file found\n');

  console.log('[2/6] Checking required event types and fields...');
  const loggerErrors = checkRequestLoggerExists();
  allErrors.push(...loggerErrors);
  if (loggerErrors.length > 0) {
    for (const error of loggerErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ All required event types and fields present');
  }
  console.log('');

  console.log('[3/6] Checking log level semantics...');
  const levelErrors = checkLevelSemantics();
  allErrors.push(...levelErrors);
  if (levelErrors.length > 0) {
    for (const error of levelErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ Log level semantics match contract');
  }
  console.log('');

  console.log('[4/6] Checking redaction configuration...');
  const redactionErrors = checkRedactionConfig();
  allErrors.push(...redactionErrors);
  if (redactionErrors.length > 0) {
    for (const error of redactionErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ Redaction paths configured');
  }
  console.log('');

  console.log('[5/6] Checking error handler correlation...');
  const correlationErrors = checkErrorHandlerCorrelation();
  allErrors.push(...correlationErrors);
  if (correlationErrors.length > 0) {
    for (const error of correlationErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ Error handler correlation present');
  }
  console.log('');

  console.log('[6/6] Checking service metadata...');
  const metadataErrors = checkServiceMetadata();
  allErrors.push(...metadataErrors);
  if (metadataErrors.length > 0) {
    for (const error of metadataErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ Service metadata configured');
  }
  console.log('');

  console.log('='.repeat(50));

  if (allErrors.length > 0) {
    console.error(`\n❌ FAILED: ${allErrors.length} error(s) found`);
    console.log('\nLogging contract drift detected. Run tests for more details:');
    console.log('  pnpm --filter api test:log-contract');
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All logging contract checks passed');
    process.exit(0);
  }
}

runLoggingContractCheck().catch((err) => {
  console.error('Logging contract check failed:', err);
  process.exit(1);
});
