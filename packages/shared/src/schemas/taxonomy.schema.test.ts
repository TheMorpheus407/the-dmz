import { describe, expect, it } from 'vitest';

import {
  threatTierSchema,
  themeIdSchema,
  surfaceIdSchema,
  parseThreatTier,
  parseThemeId,
  parseSurfaceId,
  safeParseThreatTier,
  safeParseThemeId,
  safeParseSurfaceId,
} from './taxonomy.schema.js';

describe('threatTierSchema', () => {
  it.each(['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'])('parses valid tier: %s', (tier) => {
    const result = threatTierSchema.parse(tier);
    expect(result).toBe(tier);
  });

  it('rejects invalid threat tier', () => {
    expect(() => threatTierSchema.parse('INVALID')).toThrow();
    expect(() => threatTierSchema.parse('lowercase')).toThrow();
    expect(() => threatTierSchema.parse(1)).toThrow();
    expect(() => threatTierSchema.parse(null)).toThrow();
    expect(() => threatTierSchema.parse(undefined)).toThrow();
  });
});

describe('themeIdSchema', () => {
  it.each(['green', 'amber', 'high-contrast', 'enterprise'])('parses valid theme: %s', (theme) => {
    const result = themeIdSchema.parse(theme);
    expect(result).toBe(theme);
  });

  it('rejects invalid theme ID', () => {
    expect(() => themeIdSchema.parse('blue')).toThrow();
    expect(() => themeIdSchema.parse('dark')).toThrow();
    expect(() => themeIdSchema.parse(1)).toThrow();
    expect(() => themeIdSchema.parse(null)).toThrow();
  });
});

describe('surfaceIdSchema', () => {
  it.each(['game', 'admin', 'auth', 'public'])('parses valid surface: %s', (surface) => {
    const result = surfaceIdSchema.parse(surface);
    expect(result).toBe(surface);
  });

  it('rejects invalid surface ID', () => {
    expect(() => surfaceIdSchema.parse('unknown')).toThrow();
    expect(() => surfaceIdSchema.parse(1)).toThrow();
    expect(() => surfaceIdSchema.parse(null)).toThrow();
  });
});

describe('parseThreatTier', () => {
  it('returns tier on valid input', () => {
    expect(parseThreatTier('LOW')).toBe('LOW');
    expect(parseThreatTier('SEVERE')).toBe('SEVERE');
  });

  it('throws on invalid input', () => {
    expect(() => parseThreatTier('INVALID')).toThrow();
  });
});

describe('parseThemeId', () => {
  it('returns theme on valid input', () => {
    expect(parseThemeId('green')).toBe('green');
    expect(parseThemeId('high-contrast')).toBe('high-contrast');
  });

  it('throws on invalid input', () => {
    expect(() => parseThemeId('blue')).toThrow();
  });
});

describe('parseSurfaceId', () => {
  it('returns surface on valid input', () => {
    expect(parseSurfaceId('game')).toBe('game');
    expect(parseSurfaceId('admin')).toBe('admin');
  });

  it('throws on invalid input', () => {
    expect(() => parseSurfaceId('unknown')).toThrow();
  });
});

describe('safeParseThreatTier', () => {
  it('returns tier on valid input', () => {
    expect(safeParseThreatTier('LOW')).toBe('LOW');
    expect(safeParseThreatTier('SEVERE')).toBe('SEVERE');
  });

  it('returns null on invalid input', () => {
    expect(safeParseThreatTier('INVALID')).toBeNull();
    expect(safeParseThreatTier(1)).toBeNull();
    expect(safeParseThreatTier(null)).toBeNull();
  });
});

describe('safeParseThemeId', () => {
  it('returns theme on valid input', () => {
    expect(safeParseThemeId('green')).toBe('green');
    expect(safeParseThemeId('enterprise')).toBe('enterprise');
  });

  it('returns null on invalid input', () => {
    expect(safeParseThemeId('blue')).toBeNull();
    expect(safeParseThemeId(1)).toBeNull();
  });
});

describe('safeParseSurfaceId', () => {
  it('returns surface on valid input', () => {
    expect(safeParseSurfaceId('game')).toBe('game');
    expect(safeParseSurfaceId('public')).toBe('public');
  });

  it('returns null on invalid input', () => {
    expect(safeParseSurfaceId('unknown')).toBeNull();
    expect(safeParseSurfaceId(null)).toBeNull();
  });
});
