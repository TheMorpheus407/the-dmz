import { describe, expect, it } from 'vitest';

import { ErrorCodes } from './error-codes.js';

describe('ErrorCodes', () => {
  it('exports expected error codes', () => {
    expect(ErrorCodes.AUTH_UNAUTHORIZED).toBe('AUTH_UNAUTHORIZED');
    expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    expect(ErrorCodes.SYSTEM_INTERNAL_ERROR).toBe('SYSTEM_INTERNAL_ERROR');
  });
});
