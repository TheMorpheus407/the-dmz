import { describe, expect, it } from 'vitest';

import { createTestSeason, createTestChapter } from '@the-dmz/shared/testing';
import {
  seasonSchema,
  chapterSchema,
  seasonListQuerySchema,
  chapterListQuerySchema,
  seasonListResponseSchema,
  seasonResponseSchema,
  chapterListResponseSchema,
  chapterResponseSchema,
} from '@the-dmz/shared/schemas';

describe('Season and Chapter Schemas', () => {
  describe('seasonSchema', () => {
    it('should validate a complete season', () => {
      const season = createTestSeason();
      expect(seasonSchema.parse(season)).toEqual(season);
    });

    it('should validate minimal season with required fields only', () => {
      const minimalSeason = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        seasonNumber: 1,
        title: 'Test Season',
        theme: 'Test Theme',
        logline: 'Test Logline',
        threatCurveStart: 'LOW',
        threatCurveEnd: 'HIGH',
        isActive: true,
        metadata: {},
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      expect(seasonSchema.parse(minimalSeason)).toEqual(minimalSeason);
    });

    it('should validate season with optional description', () => {
      const seasonWithDescription = {
        ...createTestSeason(),
        description: 'A test description',
      };
      expect(seasonSchema.parse(seasonWithDescription)).toEqual(seasonWithDescription);
    });

    it('should reject invalid seasonNumber (less than 1)', () => {
      const invalidSeason = {
        ...createTestSeason(),
        seasonNumber: 0,
      };
      expect(() => seasonSchema.parse(invalidSeason)).toThrow();
    });

    it('should reject invalid threatCurveStart value', () => {
      const invalidSeason = {
        ...createTestSeason(),
        threatCurveStart: 'INVALID',
      };
      expect(() => seasonSchema.parse(invalidSeason)).toThrow();
    });

    it('should reject invalid threatCurveEnd value', () => {
      const invalidSeason = {
        ...createTestSeason(),
        threatCurveEnd: 'INVALID',
      };
      expect(() => seasonSchema.parse(invalidSeason)).toThrow();
    });

    it('should reject non-UUID id', () => {
      const invalidSeason = {
        ...createTestSeason(),
        id: 'not-a-uuid',
      };
      expect(() => seasonSchema.parse(invalidSeason)).toThrow();
    });

    it('should reject non-UUID tenantId', () => {
      const invalidSeason = {
        ...createTestSeason(),
        tenantId: 'not-a-uuid',
      };
      expect(() => seasonSchema.parse(invalidSeason)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const invalidSeason = {
        ...createTestSeason(),
        unknownField: 'value',
      };
      expect(() => seasonSchema.parse(invalidSeason)).toThrow();
    });
  });

  describe('chapterSchema', () => {
    it('should validate a complete chapter', () => {
      const chapter = createTestChapter();
      expect(chapterSchema.parse(chapter)).toEqual(chapter);
    });

    it('should validate minimal chapter with required fields only', () => {
      const minimalChapter = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        seasonId: '123e4567-e89b-12d3-a456-426614174002',
        chapterNumber: 1,
        act: 1,
        title: 'Test Chapter',
        dayStart: 1,
        dayEnd: 7,
        difficultyStart: 1,
        difficultyEnd: 2,
        threatLevel: 'LOW',
        isActive: true,
        metadata: {},
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      expect(chapterSchema.parse(minimalChapter)).toEqual(minimalChapter);
    });

    it('should validate chapter with optional description', () => {
      const chapterWithDescription = {
        ...createTestChapter(),
        description: 'A test description',
      };
      expect(chapterSchema.parse(chapterWithDescription)).toEqual(chapterWithDescription);
    });

    it('should reject invalid chapterNumber (less than 1)', () => {
      const invalidChapter = {
        ...createTestChapter(),
        chapterNumber: 0,
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject invalid act (less than 1)', () => {
      const invalidChapter = {
        ...createTestChapter(),
        act: 0,
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject invalid act (greater than 3)', () => {
      const invalidChapter = {
        ...createTestChapter(),
        act: 4,
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject invalid threatLevel', () => {
      const invalidChapter = {
        ...createTestChapter(),
        threatLevel: 'INVALID',
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject invalid difficultyStart (less than 1)', () => {
      const invalidChapter = {
        ...createTestChapter(),
        difficultyStart: 0,
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject invalid difficultyEnd (greater than 5)', () => {
      const invalidChapter = {
        ...createTestChapter(),
        difficultyEnd: 6,
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject non-UUID id', () => {
      const invalidChapter = {
        ...createTestChapter(),
        id: 'not-a-uuid',
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject non-UUID tenantId', () => {
      const invalidChapter = {
        ...createTestChapter(),
        tenantId: 'not-a-uuid',
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject non-UUID seasonId', () => {
      const invalidChapter = {
        ...createTestChapter(),
        seasonId: 'not-a-uuid',
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const invalidChapter = {
        ...createTestChapter(),
        unknownField: 'value',
      };
      expect(() => chapterSchema.parse(invalidChapter)).toThrow();
    });
  });

  describe('seasonListQuerySchema', () => {
    it('should validate query with all optional params', () => {
      const query = {
        seasonNumber: 1,
        isActive: true,
      };
      expect(seasonListQuerySchema.parse(query)).toEqual(query);
    });

    it('should accept empty query', () => {
      expect(seasonListQuerySchema.parse({})).toEqual({});
    });

    it('should reject invalid seasonNumber', () => {
      const query = { seasonNumber: 0 };
      expect(() => seasonListQuerySchema.parse(query)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const query = { unknownField: 'value' };
      expect(() => seasonListQuerySchema.parse(query)).toThrow();
    });
  });

  describe('chapterListQuerySchema', () => {
    it('should validate query with all optional params', () => {
      const query = {
        act: 1,
        isActive: true,
      };
      expect(chapterListQuerySchema.parse(query)).toEqual(query);
    });

    it('should accept empty query', () => {
      expect(chapterListQuerySchema.parse({})).toEqual({});
    });

    it('should reject invalid act (less than 1)', () => {
      const query = { act: 0 };
      expect(() => chapterListQuerySchema.parse(query)).toThrow();
    });

    it('should reject invalid act (greater than 3)', () => {
      const query = { act: 4 };
      expect(() => chapterListQuerySchema.parse(query)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const query = { unknownField: 'value' };
      expect(() => chapterListQuerySchema.parse(query)).toThrow();
    });
  });

  describe('seasonListResponseSchema', () => {
    it('should validate list response structure', () => {
      const season = createTestSeason();
      const response = {
        data: [season],
      };
      expect(seasonListResponseSchema.parse(response)).toEqual(response);
    });

    it('should reject response without data array', () => {
      const response = {
        data: 'not-an-array',
      };
      expect(() => seasonListResponseSchema.parse(response)).toThrow();
    });

    it('should reject response with invalid item in data array', () => {
      const response = {
        data: [{ invalid: 'season' }],
      };
      expect(() => seasonListResponseSchema.parse(response)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const response = {
        data: [createTestSeason()],
        unknownField: 'value',
      };
      expect(() => seasonListResponseSchema.parse(response)).toThrow();
    });
  });

  describe('seasonResponseSchema', () => {
    it('should validate single season response structure', () => {
      const season = createTestSeason();
      const response = {
        data: season,
      };
      expect(seasonResponseSchema.parse(response)).toEqual(response);
    });

    it('should reject response with data as array', () => {
      const response = {
        data: [createTestSeason()],
      };
      expect(() => seasonResponseSchema.parse(response)).toThrow();
    });

    it('should reject response with invalid season data', () => {
      const response = {
        data: { invalid: 'season' },
      };
      expect(() => seasonResponseSchema.parse(response)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const response = {
        data: createTestSeason(),
        unknownField: 'value',
      };
      expect(() => seasonResponseSchema.parse(response)).toThrow();
    });
  });

  describe('chapterListResponseSchema', () => {
    it('should validate list response structure', () => {
      const chapter = createTestChapter();
      const response = {
        data: [chapter],
      };
      expect(chapterListResponseSchema.parse(response)).toEqual(response);
    });

    it('should reject response without data array', () => {
      const response = {
        data: 'not-an-array',
      };
      expect(() => chapterListResponseSchema.parse(response)).toThrow();
    });

    it('should reject response with invalid item in data array', () => {
      const response = {
        data: [{ invalid: 'chapter' }],
      };
      expect(() => chapterListResponseSchema.parse(response)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const response = {
        data: [createTestChapter()],
        unknownField: 'value',
      };
      expect(() => chapterListResponseSchema.parse(response)).toThrow();
    });
  });

  describe('chapterResponseSchema', () => {
    it('should validate single chapter response structure', () => {
      const chapter = createTestChapter();
      const response = {
        data: chapter,
      };
      expect(chapterResponseSchema.parse(response)).toEqual(response);
    });

    it('should reject response with data as array', () => {
      const response = {
        data: [createTestChapter()],
      };
      expect(() => chapterResponseSchema.parse(response)).toThrow();
    });

    it('should reject response with invalid chapter data', () => {
      const response = {
        data: { invalid: 'chapter' },
      };
      expect(() => chapterResponseSchema.parse(response)).toThrow();
    });

    it('should reject extra unknown fields', () => {
      const response = {
        data: createTestChapter(),
        unknownField: 'value',
      };
      expect(() => chapterResponseSchema.parse(response)).toThrow();
    });
  });
});
