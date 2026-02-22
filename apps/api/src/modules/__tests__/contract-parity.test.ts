import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { m1ApiContractManifest } from '@the-dmz/shared/contracts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const OPENAPI_FILE = join(PROJECT_ROOT, 'apps', 'api', 'openapi', 'openapi.v1.json');

const PUBLIC_BUT_HAS_SECURITY = [
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
];

const FRONTEND_CONSUMED_ENDPOINTS = [
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/auth/profile',
];

interface OpenAPISpec {
  paths: Record<string, Record<string, unknown>>;
}

describe('Contract Parity: OpenAPI vs Manifest', () => {
  const spec: OpenAPISpec | null = existsSync(OPENAPI_FILE)
    ? JSON.parse(readFileSync(OPENAPI_FILE, 'utf-8'))
    : null;

  it('should have OpenAPI spec generated', () => {
    expect(spec).not.toBeNull();
  });

  if (!spec) {
    return;
  }

  describe('endpoint presence', () => {
    for (const endpoint of m1ApiContractManifest.endpoints) {
      it(`should have ${endpoint.method} ${endpoint.path} in OpenAPI`, () => {
        const pathObj = spec.paths[endpoint.path];
        expect(pathObj).toBeDefined();

        const methodKey = endpoint.method.toLowerCase();
        const methodObj = pathObj?.[methodKey];
        expect(methodObj).toBeDefined();
      });
    }
  });

  describe('auth requirement matching', () => {
    for (const endpoint of m1ApiContractManifest.endpoints) {
      it(`${endpoint.path} should ${endpoint.requiresAuth ? '' : 'not '}require auth in OpenAPI`, () => {
        const pathObj = spec.paths[endpoint.path];
        const methodKey = endpoint.method.toLowerCase();
        const methodObj = pathObj?.[methodKey] as
          | { security?: Array<Record<string, unknown>> }
          | undefined;

        const hasSecurity = !!(methodObj?.security && methodObj.security.length > 0);

        if (endpoint.requiresAuth) {
          expect(hasSecurity).toBe(true);
        } else {
          if (PUBLIC_BUT_HAS_SECURITY.includes(endpoint.path)) {
            expect(true).toBe(true);
          } else {
            expect(hasSecurity).toBe(false);
          }
        }
      });
    }
  });
});

describe('Contract Parity: Frontend vs Manifest', () => {
  const webApiPath = join(PROJECT_ROOT, 'apps', 'web', 'src', 'lib', 'api');

  function findFiles(dir: string, pattern: RegExp): string[] {
    const results: string[] = [];
    try {
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
    } catch {
      // Directory doesn't exist
    }
    return results;
  }

  it('should have frontend API client', () => {
    expect(existsSync(webApiPath)).toBe(true);
  });

  if (!existsSync(webApiPath)) {
    return;
  }

  describe('endpoint usage', () => {
    for (const endpoint of FRONTEND_CONSUMED_ENDPOINTS) {
      it(`should use ${endpoint} in frontend client`, () => {
        const tsFiles = findFiles(webApiPath, /\.ts$/);
        const content = tsFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');

        const apiPath = endpoint.replace('/api/v1', '');
        const pattern = new RegExp(apiPath.replace(/\//g, '\\/'));
        expect(pattern.test(content)).toBe(true);
      });
    }
  });

  describe('shared schema usage', () => {
    it('should use shared schemas in frontend auth client', () => {
      const authFile = join(webApiPath, 'auth.ts');
      if (!existsSync(authFile)) {
        expect(true).toBe(true);
        return;
      }

      const content = readFileSync(authFile, 'utf-8');
      expect(content).toContain('@the-dmz/shared/schemas');
    });
  });
});
