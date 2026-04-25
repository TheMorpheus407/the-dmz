import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, beforeAll } from 'vitest';

describe('Sentry Removal Verification', () => {
  const packageJsonPath = resolve('./package.json');
  let packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  beforeAll(() => {
    const content = readFileSync(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(content);
  });

  describe('package.json dependencies', () => {
    it('should NOT have @sentry/sveltekit in dependencies', () => {
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies['@sentry/sveltekit']).toBeUndefined();
    });

    it('should NOT have @sentry/sveltekit in devDependencies', () => {
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies['@sentry/sveltekit']).toBeUndefined();
    });
  });

  describe('sentry.ts removal', () => {
    it('should NOT have sentry.ts file', () => {
      const sentryPath = resolve('./src/lib/sentry.ts');
      expect(existsSync(sentryPath)).toBe(false);
    });
  });

  describe('hooks.server.ts Sentry imports', () => {
    it('should NOT import initSentry from $lib/sentry.js', async () => {
      const hooksContent = readFileSync(resolve('./src/hooks.server.ts'), 'utf-8');
      expect(hooksContent).not.toContain("import { initSentry } from '$lib/sentry.js'");
      expect(hooksContent).not.toContain("import { initSentry } from '$lib/sentry'");
    });

    it('should NOT import * as Sentry from @sentry/sveltekit', async () => {
      const hooksContent = readFileSync(resolve('./src/hooks.server.ts'), 'utf-8');
      expect(hooksContent).not.toContain("import * as Sentry from '@sentry/sveltekit'");
      expect(hooksContent).not.toContain("from '@sentry/sveltekit'");
    });
  });

  describe('hooks.client.ts Sentry imports', () => {
    it('should NOT import from @sentry/sveltekit', async () => {
      const hooksContent = readFileSync(resolve('./src/hooks.client.ts'), 'utf-8');
      expect(hooksContent).not.toContain('@sentry/sveltekit');
    });
  });

  describe('hooks.server.ts Sentry initialization code', () => {
    it('should NOT reference PUBLIC_SENTRY_DSN environment variable', async () => {
      const hooksContent = readFileSync(resolve('./src/hooks.server.ts'), 'utf-8');
      expect(hooksContent).not.toContain('PUBLIC_SENTRY_DSN');
    });

    it('should NOT call initSentry() function', async () => {
      const hooksContent = readFileSync(resolve('./src/hooks.server.ts'), 'utf-8');
      expect(hooksContent).not.toContain('initSentry()');
    });
  });

  describe('old sentry test file removal', () => {
    it('should NOT have hooks.sentry.test.ts test file', () => {
      const sentryTestPath = resolve('./src/__tests__/hooks.sentry.test.ts');
      expect(existsSync(sentryTestPath)).toBe(false);
    });
  });
});
