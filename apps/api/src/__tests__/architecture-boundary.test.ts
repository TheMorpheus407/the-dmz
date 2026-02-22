import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const API_ROOT = join(import.meta.dirname, '..');

describe('architecture boundary', () => {
  describe('lint:architecture', () => {
    it('passes on valid codebase', () => {
      const result = execSync(
        'pnpm --filter api lint:architecture --ignore-pattern "src/__tests__/**"',
        {
          cwd: join(API_ROOT, '../..'),
          encoding: 'utf-8',
        },
      );
      expect(result).toBeDefined();
    });

    it('detects illegal cross-module internal import', () => {
      const modulesDir = join(API_ROOT, 'src/modules');
      const testModuleDir = join(modulesDir, '__test_boundary_module__');
      const testModuleSrcDir = join(testModuleDir, '__tests__');

      mkdirSync(testModuleSrcDir, { recursive: true });

      writeFileSync(join(testModuleDir, 'index.ts'), 'export const testValue = "test";\n');

      writeFileSync(join(testModuleDir, 'service.ts'), 'export const testService = "service";\n');

      const otherModuleDir = join(modulesDir, '__test_other_module__');
      const otherModuleTestDir = join(otherModuleDir, '__tests__');

      mkdirSync(otherModuleTestDir, { recursive: true });

      writeFileSync(join(otherModuleDir, 'index.ts'), 'export const otherValue = "other";\n');

      writeFileSync(
        join(otherModuleTestDir, 'violation.ts'),
        `import { testService } from '../__test_boundary_module__/service.js';
console.log(testService);
`,
      );

      let lintFailed = false;
      try {
        execSync('pnpm --filter api lint:architecture -- --no-cache', {
          cwd: join(API_ROOT, '../..'),
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error: unknown) {
        lintFailed = true;
        const err = error as { status?: number };
        expect(err.status).toBeGreaterThan(0);
      }

      expect(lintFailed).toBe(true);

      rmSync(testModuleDir, { recursive: true, force: true });
      rmSync(otherModuleDir, { recursive: true, force: true });
    });

    it('detects module-level circular dependency', () => {
      const moduleRootDir = join(API_ROOT, 'src/modules');

      const moduleADir = join(moduleRootDir, '__test_cycle_a__');
      const moduleBDir = join(moduleRootDir, '__test_cycle_b__');

      mkdirSync(moduleADir, { recursive: true });
      mkdirSync(moduleBDir, { recursive: true });

      writeFileSync(join(moduleADir, 'index.ts'), 'export const a = "a";\n');
      writeFileSync(
        join(moduleADir, 'service.ts'),
        'import { b } from "../__test_cycle_b__/index.js";\nexport const serviceA = b;\n',
      );

      writeFileSync(join(moduleBDir, 'index.ts'), 'export const b = "b";\n');
      writeFileSync(
        join(moduleBDir, 'service.ts'),
        'import { a } from "../__test_cycle_a__/index.js";\nexport const serviceB = a;\n',
      );

      let lintFailed = false;
      try {
        execSync('pnpm --filter api lint:architecture -- --no-cache', {
          cwd: join(API_ROOT, '../..'),
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch {
        lintFailed = true;
      }

      expect(lintFailed).toBe(true);

      rmSync(moduleADir, { recursive: true, force: true });
      rmSync(moduleBDir, { recursive: true, force: true });
    });
  });
});
