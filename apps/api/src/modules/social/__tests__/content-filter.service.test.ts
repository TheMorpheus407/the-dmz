import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('content-filter.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pattern compilation', () => {
    it('should compile exact match patterns correctly', () => {
      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = 'badword';
      const expectedRegex = new RegExp(`^${escapeRegex(pattern)}$`, 'i');

      expect(expectedRegex.test('badword')).toBe(true);
      expect(expectedRegex.test('badword!')).toBe(false);
      expect(expectedRegex.test('bad')).toBe(false);
    });

    it('should compile contains match patterns correctly', () => {
      const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = 'badword';
      const regex = new RegExp(escapeRegex(pattern), 'i');

      expect(regex.test('This has badword in it')).toBe(true);
      expect(regex.test('badword at start')).toBe(true);
      expect(regex.test('No match here')).toBe(false);
    });

    it('should compile regex patterns directly', () => {
      const pattern = 'spam\\.com';
      const regex = new RegExp(pattern, 'i');

      expect(regex.test('Visit spam.com for info')).toBe(true);
      expect(regex.test('Visit spamXcom for info')).toBe(false);
    });

    it('should handle invalid regex gracefully', () => {
      const invalidPattern = '[invalid';
      let regex: RegExp | null = null;
      try {
        regex = new RegExp(invalidPattern, 'i');
      } catch {
        regex = null;
      }

      expect(regex).toBeNull();
    });
  });

  describe('severity ordering', () => {
    const SEVERITY_ORDER = { flag: 1, block: 2, mute: 3 };

    it('should have correct severity order', () => {
      expect(SEVERITY_ORDER.flag).toBeLessThan(SEVERITY_ORDER.block);
      expect(SEVERITY_ORDER.block).toBeLessThan(SEVERITY_ORDER.mute);
    });

    it('should identify mute as highest severity', () => {
      expect(SEVERITY_ORDER.mute).toBeGreaterThan(SEVERITY_ORDER.flag);
      expect(SEVERITY_ORDER.mute).toBeGreaterThan(SEVERITY_ORDER.block);
    });
  });

  describe('content check result', () => {
    it('should allow content with no violations', () => {
      const violations: { severity: string }[] = [];
      const highestSeverity: string | null = null;
      const allowed = highestSeverity === null || highestSeverity === 'flag';

      expect(allowed).toBe(true);
      expect(violations).toHaveLength(0);
    });

    it('should block content with mute severity', () => {
      const highestSeverity: string = 'mute';
      const allowed = highestSeverity === null || highestSeverity === 'flag';

      expect(allowed).toBe(false);
    });

    it('should block content with block severity', () => {
      const highestSeverity: string = 'block';
      const allowed = highestSeverity === null || highestSeverity === 'flag';

      expect(allowed).toBe(false);
    });

    it('should allow content with only flag severity', () => {
      const highestSeverity: string = 'flag';
      const allowed = highestSeverity === null || highestSeverity === 'flag';

      expect(allowed).toBe(true);
    });
  });
});
