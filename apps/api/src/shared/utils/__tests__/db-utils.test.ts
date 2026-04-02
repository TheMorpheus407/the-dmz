import { describe, expect, it } from 'vitest';

import { AppError } from '../../middleware/error-handler.js';
import { assertCreated, CreationError } from '../db-utils.js';

describe('CreationError', () => {
  it('creates error with correct properties', () => {
    const error = new CreationError('user');
    expect(error.message).toBe('Failed to create user');
    expect(error.entityName).toBe('user');
    expect(error.code).toBe('CREATION_FAILED');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual({ entityName: 'user' });
  });

  it('is an instance of AppError and Error', () => {
    const error = new CreationError('session');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(CreationError);
  });
});

describe('assertCreated', () => {
  it('returns the result when it is defined', () => {
    const result = { id: '123', name: 'test' };
    const validated = assertCreated(result, 'entity');
    expect(validated).toBe(result);
  });

  it('returns the result when it is a valid object', () => {
    const result = { id: '456', email: 'test@example.com' };
    const validated = assertCreated(result, 'user');
    expect(validated).toBe(result);
  });

  it('throws CreationError when result is undefined', () => {
    expect(() => assertCreated(undefined, 'user')).toThrow(CreationError);
    expect(() => assertCreated(undefined, 'user')).toThrow('Failed to create user');
  });

  it('throws CreationError with correct entity name', () => {
    try {
      assertCreated(undefined, 'webhook subscription');
    } catch (error) {
      expect(error).toBeInstanceOf(CreationError);
      expect((error as CreationError).entityName).toBe('webhook subscription');
    }
  });

  it('includes entity name in error message', () => {
    expect(() => assertCreated(undefined, 'game session')).toThrow('Failed to create game session');
  });
});
