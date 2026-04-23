import { describe, expect, it } from 'vitest';

import { createInvalidResponseError } from './errors.js';

describe('createInvalidResponseError', () => {
  it('should return error with default message and no requestId', () => {
    const error = createInvalidResponseError();

    expect(error.message).toBe('Invalid response from server');
    expect(error).toEqual({
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'Invalid response from server',
      status: 500,
      retryable: false,
    });
  });

  it('should return error with custom message', () => {
    const customMessage = 'No data received from server';
    const error = createInvalidResponseError(customMessage);

    expect(error.message).toBe(customMessage);
    expect(error.category).toBe('server');
    expect(error.code).toBe('INVALID_RESPONSE');
    expect(error.status).toBe(500);
    expect(error.retryable).toBe(false);
  });

  it('should return error with requestId when provided', () => {
    const requestId = 'req-123-abc';
    const error = createInvalidResponseError('Invalid response', requestId);

    expect(error.requestId).toBe(requestId);
    expect(error.category).toBe('server');
    expect(error.code).toBe('INVALID_RESPONSE');
    expect(error.message).toBe('Invalid response');
    expect(error.status).toBe(500);
    expect(error.retryable).toBe(false);
  });

  it('should not include requestId when undefined', () => {
    const error = createInvalidResponseError('Test message');

    expect(error.requestId).toBeUndefined();
    expect('requestId' in error).toBe(false);
  });

  it('should not include requestId when explicitly passed as undefined', () => {
    const error = createInvalidResponseError('Test message', undefined);

    expect(error.requestId).toBeUndefined();
    expect('requestId' in error).toBe(false);
  });
});
