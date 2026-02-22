import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
}

interface OpenAPIOperation {
  security?: Array<Record<string, unknown>>;
  responses?: Record<string, unknown>;
}

interface OpenAPISpec {
  openapi: string;
  components: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, unknown>;
  };
  paths: Record<string, OpenAPIPath>;
}

interface ManifestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  requiresAuth: boolean;
}

const OPENAPI_OUTPUT_FILE = join(__dirname, '..', 'openapi', 'openapi.v1.json');

const M1_ENDPOINTS: ManifestEndpoint[] = [
  { path: '/api/v1/auth/register', method: 'POST', requiresAuth: false },
  { path: '/api/v1/auth/login', method: 'POST', requiresAuth: false },
  { path: '/api/v1/auth/refresh', method: 'POST', requiresAuth: false },
  { path: '/api/v1/auth/logout', method: 'DELETE', requiresAuth: true },
  { path: '/api/v1/auth/me', method: 'GET', requiresAuth: true },
  { path: '/api/v1/auth/profile', method: 'PATCH', requiresAuth: true },
  { path: '/api/v1/health/authenticated', method: 'GET', requiresAuth: true },
  { path: '/health', method: 'GET', requiresAuth: false },
  { path: '/ready', method: 'GET', requiresAuth: false },
];

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(entry)) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadOpenAPISpec(): OpenAPISpec | null {
  if (!existsSync(OPENAPI_OUTPUT_FILE)) {
    return null;
  }
  return JSON.parse(readFileSync(OPENAPI_OUTPUT_FILE, 'utf-8')) as OpenAPISpec;
}

function checkOpenAPIEndpoints(spec: OpenAPISpec): string[] {
  const errors: string[] = [];
  const paths = spec.paths || {};

  const PUBLIC_BUT_HAS_SECURITY = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
  ];

  for (const endpoint of M1_ENDPOINTS) {
    const pathObj = paths[endpoint.path];
    if (!pathObj) {
      errors.push(`M1 endpoint missing in OpenAPI: ${endpoint.method} ${endpoint.path}`);
      continue;
    }

    const methodKey = endpoint.method.toLowerCase() as keyof OpenAPIPath;
    const methodObj = pathObj[methodKey];
    if (!methodObj) {
      errors.push(`M1 endpoint missing in OpenAPI: ${endpoint.method} ${endpoint.path}`);
      continue;
    }

    const hasSecurity = methodObj.security && methodObj.security.length > 0;

    if (endpoint.requiresAuth && !hasSecurity) {
      errors.push(
        `Auth requirement mismatch: ${endpoint.method} ${endpoint.path} requires auth but OpenAPI has no security`,
      );
    }
    if (!endpoint.requiresAuth && hasSecurity && !PUBLIC_BUT_HAS_SECURITY.includes(endpoint.path)) {
      errors.push(
        `Auth requirement mismatch: ${endpoint.method} ${endpoint.path} is public but OpenAPI requires auth`,
      );
    }
  }

  return errors;
}

function checkFrontendClientManifestParity(): string[] {
  const errors: string[] = [];
  const webApiDir = join(__dirname, '..', '..', 'web', 'src', 'lib', 'api');

  if (!existsSync(webApiDir)) {
    errors.push('Frontend API client directory not found');
    return errors;
  }

  const tsFiles = findFiles(webApiDir, /\.ts$/);

  const FRONTEND_CONSUMED_ENDPOINTS = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
    '/api/v1/auth/me',
    '/api/v1/auth/profile',
  ];

  const fileContent = tsFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');

  for (const endpoint of FRONTEND_CONSUMED_ENDPOINTS) {
    const apiPath = endpoint.replace('/api/v1', '');
    const pattern = new RegExp(apiPath.replace(/\//g, '\\/'));
    if (!pattern.test(fileContent)) {
      errors.push(`Frontend client missing endpoint: ${endpoint}`);
    }
  }

  return errors;
}

function checkSharedSchemaUsage(): string[] {
  const errors: string[] = [];
  const webApiDir = join(__dirname, '..', '..', 'web', 'src', 'lib', 'api');

  if (!existsSync(webApiDir)) {
    errors.push('Frontend API client directory not found');
    return errors;
  }

  const tsFiles = findFiles(webApiDir, /\.ts$/);

  for (const file of tsFiles) {
    if (file.endsWith('.test.ts')) {
      continue;
    }

    const content = readFileSync(file, 'utf-8');

    const hasSharedImport = /@the-dmz\/shared\/schemas/.test(content);
    const hasZodInline = /z\.object\(\{/.test(content) && !/^import.*zod/.test(content);

    if (hasZodInline && !hasSharedImport) {
      const relativePath = file.replace(join(__dirname, '..', '..', 'web', 'src'), '');
      errors.push(
        `Frontend file may have ad-hoc schema (should use @the-dmz/shared/schemas): ${relativePath}`,
      );
    }
  }

  return errors;
}

async function runContractParityCheck(): Promise<void> {
  console.log('Running M1 API Contract Parity Check...\n');

  const allErrors: string[] = [];

  console.log('[1/4] Checking OpenAPI spec exists...');
  const spec = loadOpenAPISpec();
  if (!spec) {
    console.error('  ❌ OpenAPI spec not found. Run "pnpm openapi:generate" first.');
    process.exit(1);
  }
  console.log('  ✅ OpenAPI spec found\n');

  console.log('[2/4] Checking OpenAPI vs manifest endpoints...');
  const openApiErrors = checkOpenAPIEndpoints(spec);
  allErrors.push(...openApiErrors);
  if (openApiErrors.length > 0) {
    for (const error of openApiErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ All M1 endpoints present in OpenAPI');
  }
  console.log('');

  console.log('[3/4] Checking frontend client vs manifest...');
  const frontendErrors = checkFrontendClientManifestParity();
  allErrors.push(...frontendErrors);
  if (frontendErrors.length > 0) {
    for (const error of frontendErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ Frontend client aligned with manifest');
  }
  console.log('');

  console.log('[4/4] Checking shared schema usage...');
  const schemaErrors = checkSharedSchemaUsage();
  allErrors.push(...schemaErrors);
  if (schemaErrors.length > 0) {
    for (const error of schemaErrors) {
      console.log(`  ❌ ${error}`);
    }
  } else {
    console.log('  ✅ Frontend uses shared schemas');
  }
  console.log('');

  console.log('='.repeat(50));

  if (allErrors.length > 0) {
    console.error(`\n❌ FAILED: ${allErrors.length} error(s) found`);
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All contract parity checks passed');
    process.exit(0);
  }
}

runContractParityCheck().catch((err) => {
  console.error('Contract parity check failed:', err);
  process.exit(1);
});
