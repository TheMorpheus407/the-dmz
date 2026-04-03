import { describe, expect, it } from 'vitest';

import {
  hasConfiguredOutputSchema,
  isRecord,
  toPromptTemplateConflictDetails,
  validatePromptTemplateInput,
} from '../prompt-template-validator.js';

import type { PromptTemplateInput } from '../ai-pipeline.types.js';

describe('prompt-template-validator', () => {
  describe('isRecord', () => {
    it('returns true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ foo: 'bar' })).toBe(true);
    });

    it('returns false for arrays', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('returns false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe('hasConfiguredOutputSchema', () => {
    it('returns true for non-empty objects', () => {
      expect(hasConfiguredOutputSchema({ foo: 'bar' })).toBe(true);
      expect(hasConfiguredOutputSchema({ key: 1 })).toBe(true);
    });

    it('returns false for empty objects', () => {
      expect(hasConfiguredOutputSchema({})).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(hasConfiguredOutputSchema(null)).toBe(false);
      expect(hasConfiguredOutputSchema(undefined)).toBe(false);
    });

    it('returns false for arrays', () => {
      expect(hasConfiguredOutputSchema([])).toBe(false);
      expect(hasConfiguredOutputSchema([{}])).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(hasConfiguredOutputSchema('string')).toBe(false);
      expect(hasConfiguredOutputSchema(123)).toBe(false);
    });
  });

  describe('validatePromptTemplateInput', () => {
    it('accepts valid semantic versioning', () => {
      const input = { version: '1.0.0' } as Partial<PromptTemplateInput>;
      expect(() =>
        validatePromptTemplateInput(input, { requireOutputSchema: false }),
      ).not.toThrow();
    });

    it('rejects invalid semantic version formats', () => {
      expect(() =>
        validatePromptTemplateInput({ version: '1.0' } as Partial<PromptTemplateInput>, {
          requireOutputSchema: false,
        }),
      ).toThrow('version must use semantic versioning');

      expect(() =>
        validatePromptTemplateInput({ version: '1' } as Partial<PromptTemplateInput>, {
          requireOutputSchema: false,
        }),
      ).toThrow('version must use semantic versioning');

      expect(() =>
        validatePromptTemplateInput({ version: 'v1.0.0' } as Partial<PromptTemplateInput>, {
          requireOutputSchema: false,
        }),
      ).toThrow('version must use semantic versioning');

      expect(() =>
        validatePromptTemplateInput({ version: '1.0.0-beta' } as Partial<PromptTemplateInput>, {
          requireOutputSchema: false,
        }),
      ).toThrow('version must use semantic versioning');
    });

    it('throws when outputSchema is required but not provided', () => {
      expect(() =>
        validatePromptTemplateInput({} as Partial<PromptTemplateInput>, {
          requireOutputSchema: true,
        }),
      ).toThrow('outputSchema is required');
    });

    it('throws when outputSchema provided but category undefined', () => {
      expect(() =>
        validatePromptTemplateInput(
          { outputSchema: { subject: 'string' } } as Partial<PromptTemplateInput>,
          { requireOutputSchema: false },
        ),
      ).toThrow('category is required');
    });

    it('throws when outputSchema is empty object', () => {
      expect(() =>
        validatePromptTemplateInput(
          { outputSchema: {} } as Partial<PromptTemplateInput>,
          { requireOutputSchema: false },
          'email_phishing',
        ),
      ).toThrow('outputSchema must define at least one schema rule');
    });
  });

  describe('toPromptTemplateConflictDetails', () => {
    it('filters undefined values from conflict details', () => {
      const result = toPromptTemplateConflictDetails({});
      expect(result).toEqual({});

      const resultWithPartial = toPromptTemplateConflictDetails({
        name: 'test-template',
      });
      expect(resultWithPartial).toEqual({ name: 'test-template' });
    });

    it('includes all provided fields', () => {
      const result = toPromptTemplateConflictDetails({
        promptTemplateId: 'template-123',
        name: 'test-template',
        version: '1.0.0',
      });
      expect(result).toEqual({
        promptTemplateId: 'template-123',
        name: 'test-template',
        version: '1.0.0',
      });
    });

    it('filters out undefined fields specifically', () => {
      const result = toPromptTemplateConflictDetails({
        promptTemplateId: undefined,
        name: 'test-template',
        version: undefined,
      });
      expect(result).toEqual({ name: 'test-template' });
    });
  });
});
