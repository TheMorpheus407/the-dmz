import * as fs from 'fs';
import * as path from 'path';

import { KEY_CATEGORIES, REDIS_KEYSPACE_VERSION } from '../src/shared/cache/redis-key-manifest.js';

interface RedisKeyspaceViolation {
  type: 'raw_string_concatenation' | 'missing_tenant_isolation' | 'invalid_key_format';
  file: string;
  line?: number;
  key?: string;
  message: string;
}

const RAW_KEY_PATTERNS = [
  /['"`]dmz-rate-limit-.*?['"`]/g,
  /['"`]rate-limit-.*?['"`]/g,
  /redis.*?\.set\(['"`]([^'"`]+)['"`]/g,
  /redis.*?\.get\(['"`]([^'"`]+)['"`]/g,
  /await.*?incrementRateLimitKey\(\{[^}]*key:\s*['"`]([^'"`]+)['"`]/g,
];

const TENANT_CONTEXT_PATTERNS = [
  /request\.tenantContext\?\.tenantId/,
  /request\.preAuthTenantContext\?\.tenantId/,
  /tenantScopedKey\(/,
  /globalKey\(/,
];

function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'coverage' ||
        entry.name === '__tests__'
      ) {
        continue;
      }
      files.push(...getTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateFile(filePath: string): RedisKeyspaceViolation[] {
  const violations: RedisKeyspaceViolation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const usesTenantKeyBuilder = TENANT_CONTEXT_PATTERNS.some((pattern) => pattern.test(content));

  for (const pattern of RAW_KEY_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, 'g');

    while ((match = regex.exec(content)) !== null) {
      const matchStart = content.substring(0, match.index).split('\n').length;
      const key = match[1];

      if (key && !key.includes(REDIS_KEYSPACE_VERSION)) {
        violations.push({
          type: 'raw_string_concatenation',
          file: path.relative(process.cwd(), filePath),
          line: matchStart,
          key,
          message: `Raw Redis key pattern detected: '${key}'. Use tenantScopedKey() or globalKey() from '../cache/index.js' instead.`,
        });
      }
    }
  }

  if (usesTenantKeyBuilder) {
    return violations;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line) continue;

    if (
      (line.includes('redis') || line.includes('Redis')) &&
      (line.includes('key') || line.includes('increment'))
    ) {
      if (
        !line.includes('tenantScopedKey') &&
        !line.includes('globalKey') &&
        !line.includes('request.tenantContext') &&
        !line.includes('request.preAuthTenantContext')
      ) {
        const hasDirectKeyString =
          /['"`][a-zA-Z0-9_-]+:[^'"`]+['"`]/.test(line) ||
          /dmz-rate-limit/.test(line) ||
          /rate-limit/.test(line);

        if (hasDirectKeyString) {
          violations.push({
            type: 'missing_tenant_isolation',
            file: path.relative(process.cwd(), filePath),
            line: i + 1,
            message: `Potential missing tenant isolation in Redis key. Ensure tenant ID is included using tenantScopedKey() or tenant context.`,
          });
        }
      }
    }
  }

  return violations;
}

function validateKeyspace(): RedisKeyspaceViolation[] {
  const violations: RedisKeyspaceViolation[] = [];

  const srcDir = path.join(process.cwd(), 'src');
  const files = getTypeScriptFiles(srcDir);

  for (const file of files) {
    const fileViolations = validateFile(file);
    violations.push(...fileViolations);
  }

  return violations;
}

function main() {
  console.log('Validating Redis keyspace boundaries...\n');

  const violations = validateKeyspace();

  if (violations.length > 0) {
    console.log('ERROR: Redis keyspace violations detected:\n');

    const byType: Record<string, RedisKeyspaceViolation[]> = {};
    for (const v of violations) {
      const type = v.type;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(v);
    }

    for (const [type, typeViolations] of Object.entries(byType)) {
      console.log(`\n[${type.toUpperCase()}] (${typeViolations.length} violations)`);

      for (const v of typeViolations) {
        const location = v.line ? `${v.file}:${v.line}` : v.file;
        console.log(`  ${location}`);
        console.log(`    ${v.message}`);
        if (v.key) {
          console.log(`    Key: ${v.key}`);
        }
      }
    }

    console.log(`\nTotal violations: ${violations.length}`);
    console.log('\nTo fix:');
    console.log('  1. Use tenantScopedKey(category, resource, tenantId) for tenant-scoped keys');
    console.log('  2. Use globalKey(category, resource) for global keys (must be in allowlist)');
    console.log('  3. Import from: ../shared/cache/index.js');
    console.log('');

    process.exit(1);
  }

  console.log('Redis keyspace validation: PASSED\n');
  console.log(`Key categories defined:`);
  console.log(`  - ${Object.values(KEY_CATEGORIES).join(', ')}`);
  console.log(`  - Version: ${REDIS_KEYSPACE_VERSION}`);

  process.exit(0);
}

main();
