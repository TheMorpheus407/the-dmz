import { spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect, afterAll } from 'vitest';

const projectRoot = join(__dirname, '..', '..', '..', '..');

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

describe('ESLint max-lines Rule', () => {
  const testFile = join(projectRoot, 'apps', 'api', 'src', '__tests__', 'max-lines-test-temp.ts');

  afterAll(() => {
    try {
      rmSync(testFile, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should warn when file exceeds 500 lines', async () => {
    const code = Array(501).fill('export const x = 1;').join('\n');
    writeFileSync(testFile, code);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile]);

    const output = result.stdout + result.stderr;
    expect(output).toContain('max-lines');
  }, 30000);

  it('should not warn when file has 500 or fewer lines', async () => {
    const code = Array(500).fill('export const x = 1;').join('\n');
    writeFileSync(testFile, code);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile]);

    const output = result.stdout + result.stderr;
    expect(output).not.toContain('max-lines');
  }, 30000);

  it('should skip blank lines when counting', async () => {
    const code =
      Array(400).fill('export const x = 1;').join('\n') + '\n' + Array(200).fill('').join('\n');
    writeFileSync(testFile, code);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile]);

    const output = result.stdout + result.stderr;
    expect(output).not.toContain('max-lines');
  }, 30000);

  it('should skip comment lines when counting', async () => {
    const code =
      Array(400).fill('export const x = 1;').join('\n') +
      '\n' +
      Array(200).fill('// comment').join('\n');
    writeFileSync(testFile, code);

    const result = await runEslint(['--no-error-on-unmatched-pattern', testFile]);

    const output = result.stdout + result.stderr;
    expect(output).not.toContain('max-lines');
  }, 30000);

  it('should detect violations in auth.sso.routes.ts', async () => {
    const routeFile = join(
      projectRoot,
      'apps',
      'api',
      'src',
      'modules',
      'auth',
      'auth.sso.routes.ts',
    );

    const result = await runEslint(['--no-error-on-unmatched-pattern', routeFile]);

    const output = result.stdout + result.stderr;
    expect(output).toContain('max-lines');
  }, 30000);
});
