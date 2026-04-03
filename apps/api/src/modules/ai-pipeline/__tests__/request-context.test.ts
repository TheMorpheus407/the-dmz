import { describe, expect, it } from 'vitest';

import {
  emptyTemplateContext,
  pickFirstString,
  pickFirstNumber,
  readContextValue,
  readString,
  readNumber,
  resolveRequestContext,
  applyResolvedRequestContext,
  buildGenerationContext,
  assertSafeRequestedStorageMetadata,
} from '../request-context.js';

import type { ContentGenerationRequest } from '../ai-pipeline.types.js';

describe('request-context', () => {
  describe('readString', () => {
    it('returns string if non-empty', () => {
      expect(readString('hello')).toBe('hello');
      expect(readString('  test  ')).toBe('  test  ');
    });

    it('returns undefined for empty string', () => {
      expect(readString('')).toBeUndefined();
      expect(readString('   ')).toBeUndefined();
    });

    it('returns undefined for non-strings', () => {
      expect(readString(123)).toBeUndefined();
      expect(readString(null)).toBeUndefined();
      expect(readString(undefined)).toBeUndefined();
    });
  });

  describe('readNumber', () => {
    it('returns number if finite', () => {
      expect(readNumber(0)).toBe(0);
      expect(readNumber(1.5)).toBe(1.5);
    });
  });

  describe('readContextValue', () => {
    it('returns value for existing key', () => {
      const context = { foo: 'bar', count: 42 };
      expect(readContextValue(context, 'foo')).toBe('bar');
      expect(readContextValue(context, 'count')).toBe(42);
    });

    it('returns undefined for missing key', () => {
      const context = { foo: 'bar' };
      expect(readContextValue(context, 'missing')).toBeUndefined();
    });

    it('returns undefined for non-object context', () => {
      expect(readContextValue(undefined, 'foo')).toBeUndefined();
      expect(readContextValue(null, 'foo')).toBeUndefined();
      expect(readContextValue('string', 'foo')).toBeUndefined();
    });
  });

  describe('pickFirstString', () => {
    it('returns first defined non-empty string', () => {
      expect(pickFirstString(undefined, '', 'hello')).toBe('hello');
      expect(pickFirstString('first', 'second')).toBe('first');
    });

    it('returns undefined when all values are undefined/empty', () => {
      expect(pickFirstString(undefined, '', null)).toBeUndefined();
      expect(pickFirstString()).toBeUndefined();
    });
  });

  describe('pickFirstNumber', () => {
    it('returns first defined finite number', () => {
      expect(pickFirstNumber(undefined, 0, 1)).toBe(0);
      expect(pickFirstNumber(1, 2)).toBe(1);
    });

    it('returns undefined when all values are undefined', () => {
      expect(pickFirstNumber(undefined, NaN, null)).toBeUndefined();
    });
  });

  describe('resolveRequestContext', () => {
    it('resolves context from request and template', () => {
      const request = {
        category: 'email_phishing',
        faction: 'morpheus',
        attackType: 'phishing',
        threatLevel: 'HIGH',
        difficulty: 3,
      } as ContentGenerationRequest;

      const template = {
        attackType: 'malware',
        threatLevel: 'MEDIUM',
        difficulty: 2,
        season: 1,
        chapter: 5,
      };

      const result = resolveRequestContext(request, template);
      expect(result.faction).toBe('morpheus');
      expect(result.attackType).toBe('phishing');
      expect(result.threatLevel).toBe('HIGH');
      expect(result.difficulty).toBe(3);
    });

    it('omits attackType for email_legitimate category', () => {
      const request = {
        category: 'email_legitimate',
        attackType: 'phishing',
      } as ContentGenerationRequest;

      const template = {
        attackType: 'malware',
        threatLevel: null,
        difficulty: null,
        season: null,
        chapter: null,
      };

      const result = resolveRequestContext(request, template);
      expect(result.attackType).toBeUndefined();
    });
  });

  describe('applyResolvedRequestContext', () => {
    it('applies resolved context to request', () => {
      const request = {
        category: 'email_phishing',
      } as ContentGenerationRequest;

      const resolvedContext = {
        faction: 'morpheus',
        attackType: 'phishing',
      };

      const result = applyResolvedRequestContext(request, resolvedContext);
      expect(result.faction).toBe('morpheus');
      expect(result.attackType).toBe('phishing');
    });
  });

  describe('buildGenerationContext', () => {
    it('builds generation context from request and resolved context', () => {
      const request = {
        category: 'email_phishing',
        context: { custom: 'value' },
      } as ContentGenerationRequest;

      const resolvedContext = {
        faction: 'morpheus',
        attackType: 'phishing',
        threatLevel: 'HIGH',
        difficulty: 3,
        season: 1,
        chapter: 5,
        language: 'en',
        locale: 'us',
      };

      const result = buildGenerationContext(request, resolvedContext);
      expect(result.category).toBe('email_phishing');
      expect(result.faction).toBe('morpheus');
      expect(result.custom).toBe('value');
    });
  });

  describe('emptyTemplateContext', () => {
    it('has null values for all context fields', () => {
      expect(emptyTemplateContext.attackType).toBeNull();
      expect(emptyTemplateContext.threatLevel).toBeNull();
      expect(emptyTemplateContext.difficulty).toBeNull();
      expect(emptyTemplateContext.season).toBeNull();
      expect(emptyTemplateContext.chapter).toBeNull();
    });
  });

  describe('assertSafeRequestedStorageMetadata', () => {
    it('does not throw for request with no metadata', () => {
      const request = {
        category: 'email_phishing',
      } as ContentGenerationRequest;

      const resolvedContext = {
        faction: undefined,
        attackType: undefined,
        threatLevel: undefined,
        difficulty: undefined,
        season: undefined,
        chapter: undefined,
      };

      expect(() => assertSafeRequestedStorageMetadata(request, resolvedContext)).not.toThrow();
    });

    it('does not throw for safe contentName without suspicious patterns', () => {
      const request = {
        category: 'email_phishing',
        contentName: 'Archive Gate Alpha',
      } as ContentGenerationRequest;

      const resolvedContext = {
        faction: undefined,
        attackType: undefined,
        threatLevel: undefined,
        difficulty: undefined,
        season: undefined,
        chapter: undefined,
      };

      expect(() => assertSafeRequestedStorageMetadata(request, resolvedContext)).not.toThrow();
    });

    it('does not throw for safe faction from fictional universe', () => {
      const request = {
        category: 'email_phishing',
      } as ContentGenerationRequest;

      const resolvedContext = {
        faction: 'Morpheus',
        attackType: undefined,
        threatLevel: undefined,
        difficulty: undefined,
        season: undefined,
        chapter: undefined,
      };

      expect(() => assertSafeRequestedStorageMetadata(request, resolvedContext)).not.toThrow();
    });

    it('does not throw when only difficulty is set', () => {
      const request = {
        category: 'email_phishing',
      } as ContentGenerationRequest;

      const resolvedContext = {
        faction: undefined,
        attackType: undefined,
        threatLevel: undefined,
        difficulty: 3,
        season: undefined,
        chapter: undefined,
      };

      expect(() => assertSafeRequestedStorageMetadata(request, resolvedContext)).not.toThrow();
    });

    it('combines contentName and faction safely', () => {
      const request = {
        category: 'email_phishing',
        contentName: 'Nexion Alert',
      } as ContentGenerationRequest;

      const resolvedContext = {
        faction: 'Nexion Industries',
        attackType: undefined,
        threatLevel: undefined,
        difficulty: undefined,
        season: undefined,
        chapter: undefined,
      };

      expect(() => assertSafeRequestedStorageMetadata(request, resolvedContext)).not.toThrow();
    });
  });
});
