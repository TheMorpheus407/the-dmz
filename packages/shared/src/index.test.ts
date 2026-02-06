import { describe, expect, it } from 'vitest';

import { sharedVersion } from './index.js';

describe('sharedVersion', () => {
  it('is a non-empty string', () => {
    expect(typeof sharedVersion).toBe('string');
    expect(sharedVersion.length).toBeGreaterThan(0);
    expect(sharedVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
