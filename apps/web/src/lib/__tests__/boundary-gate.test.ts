import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const projectRoot = join(__dirname, '..', '..', '..', '..', '..');
const webSrcRoot = join(projectRoot, 'apps', 'web', 'src');
const webLibRoot = join(webSrcRoot, 'lib');

const adminDir = join(webLibRoot, 'admin');
const gameRootDir = join(webLibRoot, 'game');

const testFile1 = join(gameRootDir, 'boundary-test-illegal-admin-import.ts');
const testFile2 = join(adminDir, 'boundary-test-illegal-game-import.ts');
const testFile3 = join(gameRootDir, 'boundary-test-valid-index.ts');
const testFile4 = join(gameRootDir, 'boundary-test-neutral.ts');

const runEslint = (
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  return new Promise((resolve) => {
    const proc = spawn('pnpm', ['exec', 'eslint', '--no-cache', ...args], {
      cwd: projectRoot,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
  });
};

describe('Frontend Surface Boundary Gate', () => {
  beforeAll(() => {
    mkdirSync(adminDir, { recursive: true });
    writeFileSync(join(adminDir, 'index.ts'), 'export const admin = true;\n');
    mkdirSync(join(adminDir, 'services'), { recursive: true });
    writeFileSync(join(adminDir, 'services', 'test.ts'), 'export const test = 1;\n');
  });

  afterAll(() => {
    try {
      rmSync(adminDir, { recursive: true, force: true });
      rmSync(testFile1, { force: true });
      rmSync(testFile2, { force: true });
      rmSync(testFile3, { force: true });
      rmSync(testFile4, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('creates admin directory structure for boundary enforcement', () => {
    expect(existsSync(adminDir)).toBe(true);
    expect(existsSync(join(adminDir, 'index.ts'))).toBe(true);
    expect(existsSync(join(adminDir, 'services'))).toBe(true);
    expect(existsSync(join(adminDir, 'services', 'test.ts'))).toBe(true);
  });

  it('should allow imports through public index files', async () => {
    const validGameCode = `
import { something } from '../game';
export const test = something;
`;
    writeFileSync(testFile3, validGameCode);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile3]);

    const output = result.stdout + result.stderr;
    const hasRestrictedPathError = output.includes('no-restricted-paths');
    const hasNoCycleError = output.includes('no-cycle');

    expect(hasRestrictedPathError).toBe(false);
    expect(hasNoCycleError).toBe(false);
  }, 30000);

  it('should allow imports from neutral layers', async () => {
    const neutralCode = `
import { Button } from '../ui/components/Button';
import { session } from '../stores/session';
import { apiClient } from '../api/client';
export const test = { button: Button, session, client: apiClient };
`;
    writeFileSync(testFile4, neutralCode);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile4]);

    const output = result.stdout + result.stderr;
    const hasRestrictedPathError = output.includes('no-restricted-paths');
    const hasNoCycleError = output.includes('no-cycle');

    expect(hasRestrictedPathError).toBe(false);
    expect(hasNoCycleError).toBe(false);
  }, 30000);

  it('should reject illegal cross-surface imports from game to admin internals', async () => {
    const illegalGameCode = `
import { test } from '../admin/services/test';
export const result = test;
`;
    writeFileSync(testFile1, illegalGameCode);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile1]);

    const output = result.stdout + result.stderr;
    const hasRestrictedPathError = output.includes('no-restricted-path');

    expect(hasRestrictedPathError).toBe(true);
    expect(result.exitCode).not.toBe(0);
  }, 30000);

  it('should reject illegal cross-surface imports from admin to game internals', async () => {
    const illegalAdminCode = `
import { actionQueue } from '../game/services/action-queue';
export const queue = actionQueue;
`;
    writeFileSync(testFile2, illegalAdminCode);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile2]);

    const output = result.stdout + result.stderr;
    const hasRestrictedPathError = output.includes('no-restricted-paths');

    expect(hasRestrictedPathError).toBe(true);
    expect(result.exitCode).not.toBe(0);
  }, 30000);

  it('boundary enforcement is configured in eslint config', () => {
    const eslintConfigPath = join(projectRoot, 'eslint.config.mjs');
    const configContent = readFileSync(eslintConfigPath, 'utf-8');
    expect(configContent).toContain('buildWebSurfaceBoundaryZones');
    expect(configContent).toContain('no-restricted-paths');
  });
});
