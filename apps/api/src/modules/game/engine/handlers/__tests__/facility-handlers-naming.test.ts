import { describe, it, expect } from 'vitest';

import type { RevenueEventContext } from '../facility-handlers.js';

describe('facility-handlers interface naming convention', () => {
  it('RevenueEventContext should exist (renamed from RevenueEventCtx)', () => {
    const _typeCheck: RevenueEventContext = {} as RevenueEventContext;
    expect(typeof _typeCheck).toBe('object');
  });
});
