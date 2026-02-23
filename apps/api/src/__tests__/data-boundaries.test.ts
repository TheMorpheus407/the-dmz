import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

import { describe, expect, it, afterAll } from 'vitest';

const API_ROOT = join(import.meta.dirname, '../..');

const testFiles: string[] = [];

function runDataBoundariesLint(): { success: boolean; output: string } {
  try {
    const output = execSync('pnpm lint:data-boundaries', {
      cwd: API_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { success: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { success: false, output: err.stdout || err.stderr || '' };
  }
}

describe('lint:data-boundaries', () => {
  describe('valid boundary scenarios', () => {
    it('passes on valid codebase', () => {
      const result = runDataBoundariesLint();
      expect(result.success).toBe(true);
      expect(result.output).toContain('Database boundary validation: PASSED');
    });

    it('auth module can access its own tables', () => {
      const authServicePath = join(API_ROOT, 'src/modules/auth/test-boundary-access.ts');
      testFiles.push(authServicePath);

      writeFileSync(
        authServicePath,
        `import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
export const testService = sessionsTable;
`,
      );

      const result = runDataBoundariesLint();
      rmSync(authServicePath, { force: true });
      const idx = testFiles.indexOf(authServicePath);
      if (idx > -1) testFiles.splice(idx, 1);

      expect(result.success).toBe(true);
    });

    it('game module can access its own tables', () => {
      const gameServicePath = join(API_ROOT, 'src/modules/game/test-boundary-access.ts');
      testFiles.push(gameServicePath);

      writeFileSync(
        gameServicePath,
        `import { gameSessions } from '../../db/schema/game/game-sessions.js';
export const testService = gameSessions;
`,
      );

      const result = runDataBoundariesLint();
      rmSync(gameServicePath, { force: true });
      const idx = testFiles.indexOf(gameServicePath);
      if (idx > -1) testFiles.splice(idx, 1);

      expect(result.success).toBe(true);
    });

    it('modules can access shared tables via exception', () => {
      const healthServicePath = join(API_ROOT, 'src/modules/health/test-shared-access.ts');
      testFiles.push(healthServicePath);

      writeFileSync(
        healthServicePath,
        `import { users } from '../../shared/database/schema/users.js';
export const testService = users;
`,
      );

      const result = runDataBoundariesLint();
      rmSync(healthServicePath, { force: true });
      const idx = testFiles.indexOf(healthServicePath);
      if (idx > -1) testFiles.splice(idx, 1);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid boundary scenarios', () => {
    it('detects game module accessing auth tables', () => {
      const gameServicePath = join(API_ROOT, 'src/modules/game/test-violation-access.ts');
      testFiles.push(gameServicePath);

      writeFileSync(
        gameServicePath,
        `import { sessions } from '../../db/schema/auth/sessions.js';
export const testService = sessions;
`,
      );

      const result = runDataBoundariesLint();
      rmSync(gameServicePath, { force: true });
      const idx = testFiles.indexOf(gameServicePath);
      if (idx > -1) testFiles.splice(idx, 1);

      expect(result.success).toBe(false);
    });

    it('detects auth module accessing game tables', () => {
      const authServicePath = join(API_ROOT, 'src/modules/auth/test-game-access.ts');
      testFiles.push(authServicePath);

      writeFileSync(
        authServicePath,
        `import { gameSessions } from '../../db/schema/game/game-sessions.js';
export const testService = gameSessions;
`,
      );

      const result = runDataBoundariesLint();
      rmSync(authServicePath, { force: true });
      const idx = testFiles.indexOf(authServicePath);
      if (idx > -1) testFiles.splice(idx, 1);

      expect(result.success).toBe(false);
    });

    it('detects raw SQL foreign schema reference', () => {
      const testDir = join(API_ROOT, 'src/modules/__test_sql_violation__');
      mkdirSync(testDir, { recursive: true });

      writeFileSync(
        join(testDir, 'service.ts'),
        `import { sql } from 'drizzle-orm';
export const testQuery = sql\`SELECT * FROM auth.sessions\`;
`,
      );

      const result = runDataBoundariesLint();
      rmSync(testDir, { recursive: true, force: true });
      expect(result.success).toBe(false);
    });
  });

  afterAll(() => {
    for (const file of testFiles) {
      rmSync(file, { force: true });
    }
  });
});
