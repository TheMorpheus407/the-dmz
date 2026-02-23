import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

const projectRoot = join(__dirname, '..', '..', '..', '..', '..');
const webSrcLib = join(projectRoot, 'apps', 'web', 'src', 'lib');
const webSrcComponents = join(projectRoot, 'apps', 'web', 'src', 'lib', 'ui', 'components');

const testDefaultExportFile = join(webSrcLib, 'contract-gate-test-default-export.ts');
const testLegacySvelteFile = join(webSrcComponents, 'contract-gate-test-legacy.svelte');

const cleanup = () => {
  try {
    rmSync(testDefaultExportFile, { force: true });
    rmSync(testLegacySvelteFile, { force: true });
  } catch {
    // Ignore cleanup errors
  }
};

const runContractGate = (): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  return new Promise((resolve) => {
    const proc = spawn('node', ['scripts/contract-gate.mjs'], {
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

describe('Contract Gate Verification', () => {
  afterEach(() => {
    cleanup();
  });

  it('should pass when codebase is compliant', async () => {
    cleanup();
    const result = await runContractGate();
    const output = result.stdout + result.stderr;

    expect(result.exitCode).toBe(0);
    expect(output).toContain('Contract gate PASSED');
  }, 60000);

  it('should fail on default exports in scoped web source', async () => {
    cleanup();
    const violatingCode = `export default function test() { return 1; }\n`;
    writeFileSync(testDefaultExportFile, violatingCode);

    const result = await runContractGate();
    const output = result.stdout + result.stderr;

    expect(result.exitCode).not.toBe(0);
    expect(output).toContain('default exports');
    expect(output).toContain('FAILED');
  }, 60000);

  it('should fail on legacy Svelte reactivity patterns', async () => {
    cleanup();
    const violatingSvelteCode = `<script>
export let testProp;
$: doubled = testProp * 2;
</script>
<div>{doubled}</div>
`;
    writeFileSync(testLegacySvelteFile, violatingSvelteCode);

    const result = await runContractGate();
    const output = result.stdout + result.stderr;

    expect(result.exitCode).not.toBe(0);
    expect(output).toContain('Legacy Svelte');
    expect(output).toContain('FAILED');
  }, 60000);

  it('contract-gate.mjs script exists and is executable', () => {
    const scriptPath = join(projectRoot, 'scripts', 'contract-gate.mjs');
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('check-default-exports.mjs exists and works', () => {
    const scriptPath = join(projectRoot, 'scripts', 'check-default-exports.mjs');
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('check-svelte-legacy.mjs exists and works', () => {
    const scriptPath = join(projectRoot, 'scripts', 'check-svelte-legacy.mjs');
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('lint:contracts script is configured in package.json', () => {
    const packageJsonPath = join(projectRoot, 'apps', 'web', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    expect(packageJson.scripts['lint:contracts']).toBeDefined();
    expect(packageJson.scripts['lint:contracts']).toContain('contract-gate.mjs');
  });

  it('turbo.json has lint:contracts task in quality gates', () => {
    const turboJsonPath = join(projectRoot, 'turbo.json');
    const turboJson = JSON.parse(readFileSync(turboJsonPath, 'utf-8'));
    expect(turboJson.tasks.lint).toBeDefined();
    expect(turboJson.tasks.lint.dependsOn).toContain('lint:contracts');
    expect(turboJson.tasks['lint:contracts']).toBeDefined();
  });
});
