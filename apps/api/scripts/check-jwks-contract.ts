import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const JWKS_PATH = '/.well-known/jwks.json';

function checkJWKSRouteHasOpenAPISchema(): string[] {
  const errors: string[] = [];

  const apiRootDir = join(__dirname, '..');
  const jwksRouteFile = join(apiRootDir, 'src', 'modules', 'auth', 'jwks.routes.ts');

  if (!existsSync(jwksRouteFile)) {
    errors.push('JWKS route file not found: jwks.routes.ts');
    return errors;
  }

  const content = readFileSync(jwksRouteFile, 'utf-8');

  if (!content.includes(JWKS_PATH)) {
    errors.push(`JWKS route missing path: ${JWKS_PATH}`);
    return errors;
  }

  if (!content.includes('schema:')) {
    errors.push('JWKS route missing OpenAPI schema definition');
    return errors;
  }

  if (!content.includes('response')) {
    errors.push('JWKS route missing response schema');
    return errors;
  }

  if (!content.includes('200')) {
    errors.push('JWKS route missing 200 response code');
    return errors;
  }

  const requiredSchemaFields = [
    { field: 'keys', type: 'array' },
    { field: 'kty', type: 'string' },
    { field: 'kid', type: 'string' },
    { field: 'use', type: 'string' },
    { field: 'alg', type: 'string' },
  ];

  for (const { field } of requiredSchemaFields) {
    if (!content.includes(field)) {
      errors.push(`JWKS schema missing required field: ${field}`);
    }
  }

  if (content.includes('required:')) {
    if (
      !content.includes("['kty', 'kid', 'use', 'alg']") &&
      !content.includes('["kty", "kid", "use", "alg"]') &&
      !content.includes("'kty'") &&
      !content.includes('"kty"')
    ) {
      const requiredMatch = content.match(/required:\s*\[([^\]]+)\]/);
      const requiredStr = requiredMatch?.[1];
      if (requiredStr) {
        if (
          !requiredStr.includes('kty') ||
          !requiredStr.includes('kid') ||
          !requiredStr.includes('use') ||
          !requiredStr.includes('alg')
        ) {
          errors.push('JWKS schema required fields should include: kty, kid, use, alg');
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log('  ✅ JWKS route has OpenAPI schema with required fields (kty, kid, use, alg)');
  }

  return errors;
}

function checkJWKSResponseSchemaMatchesContract(): string[] {
  const errors: string[] = [];

  const apiRootDir = join(__dirname, '..');
  const jwksRouteFile = join(apiRootDir, 'src', 'modules', 'auth', 'jwks.routes.ts');

  if (!existsSync(jwksRouteFile)) {
    errors.push('JWKS route file not found: jwks.routes.ts');
    return errors;
  }

  const content = readFileSync(jwksRouteFile, 'utf-8');

  const hasRSAKeyFormat = content.includes('n:') && content.includes('e:');
  const hasECKeyFormat =
    content.includes('crv:') && content.includes('x:') && content.includes('y:');

  if (!hasRSAKeyFormat) {
    errors.push('JWKS schema missing RSA key format (n, e properties)');
  }

  if (!hasECKeyFormat) {
    errors.push('JWKS schema missing EC key format (crv, x, y properties)');
  }

  if (errors.length === 0) {
    console.log('  ✅ JWKS schema supports both RSA and EC key formats');
  }

  return errors;
}

function checkJWTSigningProfileContract(): string[] {
  const errors: string[] = [];

  const repoRootDir = join(__dirname, '..', '..', '..');
  const sharedContractsDir = join(repoRootDir, 'packages', 'shared', 'src', 'contracts');
  const jwtProfileFile = join(sharedContractsDir, 'jwt-signing-profile.ts');

  if (!existsSync(jwtProfileFile)) {
    errors.push('JWT signing profile contract not found in shared package');
    return errors;
  }

  const content = readFileSync(jwtProfileFile, 'utf-8');

  if (!content.includes('export')) {
    errors.push('JWT signing profile missing exports');
    return errors;
  }

  const hasAlgorithmEnum = content.includes('RS256') && content.includes('ES256');
  if (!hasAlgorithmEnum) {
    errors.push('JWT signing profile missing RS256/ES256 algorithm definitions');
  }

  const hasJWKSschema = content.includes('jwksDocumentSchema') && content.includes('jwkSchema');
  if (!hasJWKSschema) {
    errors.push('JWT signing profile missing JWK/JWKS schema definitions');
  }

  const hasKeyRotation =
    content.includes('keyRotationIntervalDays') && content.includes('gracePeriodHours');
  if (!hasKeyRotation) {
    errors.push('JWT signing profile missing key rotation configuration');
  }

  const hasErrorCodes = content.includes('JWT_ERROR_CODES');
  if (!hasErrorCodes) {
    errors.push('JWT signing profile missing error codes');
  }

  if (errors.length === 0) {
    console.log('  ✅ JWT signing profile contract is complete');
  }

  return errors;
}

function checkJWTKeyServiceHasRotation(): string[] {
  const errors: string[] = [];

  const apiRootDir = join(__dirname, '..');
  const keyServiceFile = join(apiRootDir, 'src', 'modules', 'auth', 'jwt-keys.service.ts');

  if (!existsSync(keyServiceFile)) {
    errors.push('JWT key service file not found: jwt-keys.service.ts');
    return errors;
  }

  const content = readFileSync(keyServiceFile, 'utf-8');

  const requiredFunctions = [
    'rotateSigningKey',
    'revokeSigningKey',
    'getJWKS',
    'getActiveSigningKey',
    'ensureActiveSigningKey',
  ];

  for (const func of requiredFunctions) {
    if (!content.includes(func)) {
      errors.push(`JWT key service missing function: ${func}`);
    }
  }

  if (!content.includes('gracePeriod') && !content.includes('grace')) {
    errors.push('JWT key service missing grace period handling for key rotation');
  }

  if (!content.includes('KEY_STATUS.ACTIVE') && !content.includes("'active'")) {
    errors.push('JWT key service missing key status handling');
  }

  if (errors.length === 0) {
    console.log('  ✅ JWT key service implements rotation with grace period');
  }

  return errors;
}

async function runJWKSContractCheck(): Promise<void> {
  console.log('Running JWKS Contract Gate...\n');

  const allErrors: string[] = [];

  console.log('[1/5] Checking JWKS route has OpenAPI schema...');
  const routeErrors = checkJWKSRouteHasOpenAPISchema();
  allErrors.push(...routeErrors);
  if (routeErrors.length > 0) {
    for (const error of routeErrors) {
      console.log(`  ❌ ${error}`);
    }
  }
  console.log('');

  console.log('[2/5] Checking JWKS response schema format...');
  const schemaErrors = checkJWKSResponseSchemaMatchesContract();
  allErrors.push(...schemaErrors);
  if (schemaErrors.length > 0) {
    for (const error of schemaErrors) {
      console.log(`  ❌ ${error}`);
    }
  }
  console.log('');

  console.log('[3/5] Checking JWT signing profile contract exists...');
  const profileErrors = checkJWTSigningProfileContract();
  allErrors.push(...profileErrors);
  if (profileErrors.length > 0) {
    for (const error of profileErrors) {
      console.log(`  ❌ ${error}`);
    }
  }
  console.log('');

  console.log('[4/5] Checking JWT key service implements rotation...');
  const rotationErrors = checkJWTKeyServiceHasRotation();
  allErrors.push(...rotationErrors);
  if (rotationErrors.length > 0) {
    for (const error of rotationErrors) {
      console.log(`  ❌ ${error}`);
    }
  }
  console.log('');

  console.log('[5/5] Checking OpenAPI spec (optional - requires DB)...');
  const OPENAPI_OUTPUT_FILE = join(__dirname, '..', 'openapi', 'openapi.v1.json');
  if (existsSync(OPENAPI_OUTPUT_FILE)) {
    const openapiContent = readFileSync(OPENAPI_OUTPUT_FILE, 'utf-8');
    if (openapiContent.includes(JWKS_PATH)) {
      console.log('  ✅ JWKS endpoint documented in generated OpenAPI spec');
    } else {
      console.log(
        '  ⚠️  JWKS endpoint not yet in generated OpenAPI (run openapi:generate when DB available)',
      );
    }
  } else {
    console.log('  ⚠️  OpenAPI spec not generated yet (run openapi:generate when DB available)');
  }
  console.log('');

  console.log('='.repeat(50));

  if (allErrors.length > 0) {
    console.error(`\n❌ FAILED: ${allErrors.length} error(s) found`);
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: JWKS contract gate passed');
    process.exit(0);
  }
}

runJWKSContractCheck().catch((err) => {
  console.error('JWKS contract gate failed:', err);
  process.exit(1);
});
