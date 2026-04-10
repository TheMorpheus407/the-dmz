import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../../../../');
const envExamplePath = join(projectRoot, '.env.example');

describe('ALLOW_SEEDING environment variable documentation', () => {
  const envExampleContent = readFileSync(envExamplePath, 'utf-8');

  it('documents ALLOW_SEEDING in .env.example', () => {
    expect(envExampleContent).toContain('ALLOW_SEEDING');
  });

  it('has a Seeding section header in .env.example', () => {
    const hasSeedingSection =
      envExampleContent.includes('# -----') &&
      envExampleContent.includes('Seeding') &&
      envExampleContent.indexOf('Seeding') > envExampleContent.indexOf('# -----');
    expect(hasSeedingSection).toBe(true);
  });

  it('documents accepted values for ALLOW_SEEDING as 1 or true', () => {
    const allowSeedingIndex = envExampleContent.indexOf('ALLOW_SEEDING');
    expect(allowSeedingIndex).toBeGreaterThanOrEqual(0);
    const afterContent = envExampleContent.slice(allowSeedingIndex, allowSeedingIndex + 200);
    expect(afterContent).toMatch(/1.*true|true.*1/);
  });

  it('includes a comment explaining the purpose of ALLOW_SEEDING', () => {
    const allowSeedingIndex = envExampleContent.indexOf('ALLOW_SEEDING');
    expect(allowSeedingIndex).toBeGreaterThanOrEqual(0);
    const beforeContent = envExampleContent.slice(
      Math.max(0, allowSeedingIndex - 300),
      allowSeedingIndex,
    );
    expect(beforeContent).toMatch(/seed/i);
  });

  it('ALLOW_SEEDING is not marked as a secret variable', () => {
    const allowSeedingIndex = envExampleContent.indexOf('ALLOW_SEEDING');
    expect(allowSeedingIndex).toBeGreaterThanOrEqual(0);
    const beforeContent = envExampleContent.slice(
      Math.max(0, allowSeedingIndex - 100),
      allowSeedingIndex,
    );
    expect(beforeContent).not.toContain('[SECRET]');
  });
});
