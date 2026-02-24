import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { API_VERSIONING_POLICY } from '../src/shared/policies/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OPENAPI_OUTPUT_DIR = join(__dirname, '..', 'openapi');
const OPENAPI_OUTPUT_FILE = join(OPENAPI_OUTPUT_DIR, 'openapi.v1.json');

async function generateOpenApiSpec(): Promise<void> {
  const config = loadConfig({
    NODE_ENV: 'development',
    DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://dmz:dmz_dev@localhost:5432/dmz_dev',
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

  const openApiSpec = app.swagger() as {
    servers?: Array<{ url: string; description?: string }>;
  };

  await app.close();

  openApiSpec.servers = [
    {
      url: 'http://localhost:3001/api/v1',
      description: 'Local development',
    },
    ...(API_VERSIONING_POLICY.openApi.servers as Array<{ url: string; description: string }>),
  ];

  if (!existsSync(OPENAPI_OUTPUT_DIR)) {
    mkdirSync(OPENAPI_OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OPENAPI_OUTPUT_FILE, JSON.stringify(openApiSpec, null, 2), 'utf-8');

  console.log(`OpenAPI spec generated at: ${OPENAPI_OUTPUT_FILE}`);
}

generateOpenApiSpec().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
