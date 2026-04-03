import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const OPENAPI_OUTPUT_DIR = join(__dirname, '..', 'openapi');
const OPENAPI_OUTPUT_FILE = join(OPENAPI_OUTPUT_DIR, 'openapi.v1.json');

const ENCRYPTION_KEY = 'openapi-encryption-key-minimum-32ch';

process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'openapi-generation-secret';
process.env['TOKEN_HASH_SALT'] = process.env['TOKEN_HASH_SALT'] ?? 'openapi-salt';
process.env['JWT_PRIVATE_KEY_ENCRYPTION_KEY'] =
  process.env['JWT_PRIVATE_KEY_ENCRYPTION_KEY'] ?? ENCRYPTION_KEY;
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] ?? 'postgresql://dmz:dmz_dev@localhost:5432/dmz_dev';
process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

function formatJsonWithInlineArrays(obj: unknown, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  const nextSpaces = ' '.repeat(indent + 2);

  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }

    const formattedItems = obj.map((item) => formatJsonWithInlineArrays(item, indent + 2));

    const singleLineContent = formattedItems.join(', ');
    const singleLine = `[${singleLineContent}]`;

    const multiLineContent = formattedItems.map((item) => `${nextSpaces}${item}`).join(',\n');

    const wouldBeMultiLine = formattedItems.some(
      (item) => item.includes('\n') || `${nextSpaces}${item}`.length > 100,
    );

    if (!wouldBeMultiLine && singleLine.length <= 100) {
      return singleLine;
    }

    return `[\n${multiLineContent}\n${spaces}]`;
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) {
    return '{}';
  }

  const formattedFields = entries.map(([key, value]) => {
    const formatted = formatJsonWithInlineArrays(value, indent + 2);
    return `${nextSpaces}"${key}": ${formatted}`;
  });

  return `{\n${formattedFields.join(',\n')}\n${spaces}}`;
}

async function generateOpenApiSpec(): Promise<void> {
  const { loadConfig } = await import('../src/config.js');
  const { buildApp } = await import('../src/app.js');
  const { API_VERSIONING_POLICY } = await import('../src/shared/policies/index.js');

  const config = loadConfig({
    NODE_ENV: 'development',
    DATABASE_URL: process.env['DATABASE_URL']!,
    REDIS_URL: process.env['REDIS_URL']!,
    LOG_LEVEL: 'silent',
    JWT_SECRET: process.env['JWT_SECRET']!,
    CORS_ORIGINS: process.env['CORS_ORIGINS'] ?? 'http://localhost:5173',
    TOKEN_HASH_SALT: process.env['TOKEN_HASH_SALT']!,
    JWT_PRIVATE_KEY_ENCRYPTION_KEY: process.env['JWT_PRIVATE_KEY_ENCRYPTION_KEY']!,
    ENABLE_SWAGGER: 'false',
    API_VERSION: '1.0.0',
    TENANT_RESOLVER_ENABLED: 'false',
  });

  const app = await buildApp(config, { skipHealthCheck: true });

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

  const formattedSpec = formatJsonWithInlineArrays(openApiSpec, 0);

  writeFileSync(OPENAPI_OUTPUT_FILE, formattedSpec, 'utf-8');

  console.log(`OpenAPI spec generated at: ${OPENAPI_OUTPUT_FILE}`);
}

generateOpenApiSpec().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
