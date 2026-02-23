import { describe, expect, it } from 'vitest';

import { validateEventVersion } from '../ownership-manifest.js';

describe('Version Policy - Compatible Evolution', () => {
  it('should allow additive changes (new optional fields)', () => {
    const result = validateEventVersion('auth.user.created', 1);
    expect(result.valid).toBe(true);
  });

  it('should allow version within maxVersion bound', () => {
    const result = validateEventVersion('auth.user.created', 5);
    expect(result.valid).toBe(true);
  });
});

describe('Version Policy - Breaking Changes', () => {
  it('should reject versions exceeding maxVersion', () => {
    const result = validateEventVersion('auth.user.created', 999);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed version');
  });
});

describe('Version Policy - Unknown Versions', () => {
  it('should handle unregistered event versions', () => {
    const result = validateEventVersion('nonexistent.event', 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not registered');
  });
});
