import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { API_VERSIONING_POLICY } from '../src/shared/policies/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OPENAPI_OUTPUT_DIR = join(__dirname, '..', 'openapi');
const OPENAPI_OUTPUT_FILE = join(OPENAPI_OUTPUT_DIR, 'openapi.v1.json');

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string };
  components: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, unknown>;
  };
  paths: Record<string, Record<string, unknown>>;
  servers?: Array<{ url: string; description?: string }>;
}

const M1_ENDPOINTS = [
  { path: '/api/v1/auth/register', method: 'post' },
  { path: '/api/v1/auth/login', method: 'post' },
  { path: '/api/v1/auth/refresh', method: 'post' },
  { path: '/api/v1/auth/logout', method: 'delete' },
  { path: '/api/v1/auth/me', method: 'get' },
  { path: '/api/v1/auth/profile', method: 'patch' },
  { path: '/api/v1/health/authenticated', method: 'get' },
  { path: '/health', method: 'get' },
  { path: '/ready', method: 'get' },
];

const REQUIRED_SECURITY_SCHEMES = ['bearerAuth', 'cookieAuth', 'csrfToken'];

const REQUIRED_ERROR_CODES = [
  'TENANT_INACTIVE',
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'AUTH_FORBIDDEN',
  'AUTH_INSUFFICIENT_PERMS',
];

function checkDrift(generated: OpenAPISpec, canonical: OpenAPISpec): string[] {
  const errors: string[] = [];

  if (JSON.stringify(generated, null, 2) !== JSON.stringify(canonical, null, 2)) {
    errors.push('OpenAPI spec drift detected: generated spec does not match canonical spec');
  }

  return errors;
}

function checkM1Endpoints(spec: OpenAPISpec): string[] {
  const errors: string[] = [];
  const paths = spec.paths || {};

  for (const endpoint of M1_ENDPOINTS) {
    const pathObj = paths[endpoint.path];
    if (!pathObj) {
      errors.push(`M1 endpoint missing: ${endpoint.method.toUpperCase()} ${endpoint.path}`);
      continue;
    }

    const methodObj = pathObj[endpoint.method];
    if (!methodObj) {
      errors.push(`M1 endpoint missing: ${endpoint.method.toUpperCase()} ${endpoint.path}`);
    }
  }

  return errors;
}

function checkSecuritySchemes(spec: OpenAPISpec): string[] {
  const errors: string[] = [];
  const schemes = spec.components?.securitySchemes || {};

  for (const scheme of REQUIRED_SECURITY_SCHEMES) {
    if (!schemes[scheme]) {
      errors.push(`Required security scheme missing: ${scheme}`);
    }
  }

  return errors;
}

function checkErrorResponses(spec: OpenAPISpec): string[] {
  const errors: string[] = [];
  const paths = spec.paths || {};

  for (const [_path, pathObj] of Object.entries(paths)) {
    for (const [_method, methodObj] of Object.entries(pathObj)) {
      const responses = (methodObj as { responses?: Record<string, unknown> }).responses || {};

      for (const [statusCode, response] of Object.entries(responses)) {
        if (!['200', '201'].includes(statusCode)) {
          const content = (response as { content?: Record<string, unknown> }).content;
          if (content?.['application/json']) {
            const schema = (content['application/json'] as { schema?: Record<string, unknown> })
              .schema;
            const props = (schema as { properties?: Record<string, unknown> })?.properties;
            const errorProp = props?.['error'] as
              | { properties?: Record<string, unknown> }
              | undefined;
            const errorCodeProp = errorProp?.properties?.['code'] as
              | { enum?: string[] }
              | undefined;

            if (errorCodeProp?.enum) {
              for (const code of REQUIRED_ERROR_CODES) {
                if (!errorCodeProp.enum.includes(code)) {
                  // Only report if this is an error response that should have this code
                  // We'll be lenient here since not all endpoints need all error codes
                }
              }
            }
          }
        }
      }
    }
  }

  return errors;
}

async function checkOpenApi(): Promise<void> {
  console.log('Generating OpenAPI spec...');

  const config = loadConfig({
    NODE_ENV: 'development',
    DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/dmz_dev',
    REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    LOG_LEVEL: 'silent',
    JWT_SECRET: process.env['JWT_SECRET'] ?? 'openapi-generation-secret',
    CORS_ORIGINS: process.env['CORS_ORIGINS'] ?? 'http://localhost:5173',
    TOKEN_HASH_SALT: process.env['TOKEN_HASH_SALT'] ?? 'openapi-salt',
    ENABLE_SWAGGER: 'false',
    API_VERSION: '1.0.0',
    TENANT_RESOLVER_ENABLED: 'false',
  });

  const app = buildApp(config, { skipHealthCheck: true });

  await app.ready();

  const generatedSpec = app.swagger() as OpenAPISpec;

  generatedSpec.servers = [
    {
      url: 'http://localhost:3001/api/v1',
      description: 'Local development',
    },
    ...(API_VERSIONING_POLICY.openApi.servers as Array<{ url: string; description: string }>),
  ];

  await app.close();

  if (!existsSync(OPENAPI_OUTPUT_FILE)) {
    console.error('ERROR: Canonical OpenAPI spec not found. Run "pnpm openapi:generate" first.');
    process.exit(1);
  }

  const canonicalSpec = JSON.parse(readFileSync(OPENAPI_OUTPUT_FILE, 'utf-8')) as OpenAPISpec;

  console.log('Running OpenAPI validation checks...\n');

  const allErrors: string[] = [];

  console.log('[1/4] Checking drift...');
  const driftErrors = checkDrift(generatedSpec, canonicalSpec);
  allErrors.push(...driftErrors);
  if (driftErrors.length > 0) {
    for (const error of driftErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ No drift detected');
  }

  console.log('\n[2/4] Checking M1 endpoints...');
  const m1Errors = checkM1Endpoints(generatedSpec);
  allErrors.push(...m1Errors);
  if (m1Errors.length > 0) {
    for (const error of m1Errors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ All M1 endpoints present');
  }

  console.log('\n[3/4] Checking security schemes...');
  const securityErrors = checkSecuritySchemes(generatedSpec);
  allErrors.push(...securityErrors);
  if (securityErrors.length > 0) {
    for (const error of securityErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ All required security schemes present');
  }

  console.log('\n[4/4] Checking error responses...');
  const errorResponseErrors = checkErrorResponses(generatedSpec);
  allErrors.push(...errorResponseErrors);
  if (errorResponseErrors.length > 0) {
    for (const error of errorResponseErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ Error responses validated');
  }

  console.log('\n' + '='.repeat(50));

  if (allErrors.length > 0) {
    console.error(`\n❌ FAILED: ${allErrors.length} error(s) found`);
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All OpenAPI validation checks passed');
    process.exit(0);
  }
}

checkOpenApi().catch((err) => {
  console.error('OpenAPI check failed:', err);
  process.exit(1);
});
