import { describe, expect, it } from 'vitest';

import {
  isPromptTemplateUniqueViolation,
  throwPromptTemplateConflict,
  rethrowPromptTemplateWriteError,
} from '../prompt-template-error-handler.js';

describe('prompt-template-error-handler', () => {
  describe('isPromptTemplateUniqueViolation', () => {
    it('returns true for PostgreSQL unique violation with name_version constraint', () => {
      const error = {
        code: '23505',
        constraint_name: 'ai_prompt_templates_name_version_idx',
      };
      expect(isPromptTemplateUniqueViolation(error)).toBe(true);
    });

    it('returns true for unique violation with short constraint name', () => {
      const error = {
        code: '23505',
        constraint: 'ai_prompt_templates_name_version_idx',
      };
      expect(isPromptTemplateUniqueViolation(error)).toBe(true);
    });

    it('returns true for unique violation when constraint is undefined', () => {
      const error = {
        code: '23505',
      };
      expect(isPromptTemplateUniqueViolation(error)).toBe(true);
    });

    it('returns false for non-23505 error codes', () => {
      const error = {
        code: '23502',
        constraint_name: 'some_constraint',
      };
      expect(isPromptTemplateUniqueViolation(error)).toBe(false);
    });

    it('returns false for different constraint names', () => {
      const error = {
        code: '23505',
        constraint_name: 'some_other_constraint',
      };
      expect(isPromptTemplateUniqueViolation(error)).toBe(false);
    });

    it('returns false for non-string code field', () => {
      const error = {
        code: 23505,
        constraint_name: 'ai_prompt_templates_name_version_idx',
      };
      expect(isPromptTemplateUniqueViolation(error)).toBe(false);
    });

    it('returns false for non-record input', () => {
      expect(isPromptTemplateUniqueViolation('string')).toBe(false);
      expect(isPromptTemplateUniqueViolation(null)).toBe(false);
      expect(isPromptTemplateUniqueViolation(undefined)).toBe(false);
      expect(isPromptTemplateUniqueViolation(123)).toBe(false);
    });
  });

  describe('throwPromptTemplateConflict', () => {
    it('throws conflict error with details', () => {
      expect(() =>
        throwPromptTemplateConflict('tenant-123', {
          name: 'test-template',
          version: '1.0.0',
        }),
      ).toThrow('A prompt template with this name and version already exists');
    });
  });

  describe('rethrowPromptTemplateWriteError', () => {
    it('rethrows unique violations as conflict errors', () => {
      const error = {
        code: '23505',
        constraint_name: 'ai_prompt_templates_name_version_idx',
      };
      expect(() =>
        rethrowPromptTemplateWriteError(error, 'tenant-123', {
          name: 'test-template',
          version: '1.0.0',
        }),
      ).toThrow('A prompt template with this name and version already exists');
    });

    it('passes through non-unique violations unchanged', () => {
      const error = new Error('Some other error');
      expect(() => rethrowPromptTemplateWriteError(error, 'tenant-123', {})).toThrow(error);
    });
  });
});
