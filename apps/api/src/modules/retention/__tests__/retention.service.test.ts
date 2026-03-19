import { describe, it, expect } from 'vitest';

import { validateRetentionDays, calculateExpiryDate } from '../retention.service.js';
import {
  dataCategories,
  DEFAULT_RETENTION_DAYS,
  MIN_AUDIT_RETENTION_DAYS,
} from '../../../db/schema/retention/index.js';

describe('retention.service', () => {
  describe('validateRetentionDays', () => {
    it('should enforce minimum audit retention of 2555 days', () => {
      const result = validateRetentionDays('audit_logs', 100);
      expect(result).toBe(MIN_AUDIT_RETENTION_DAYS);
    });

    it('should cap audit retention at 2555 days (max)', () => {
      const result = validateRetentionDays('audit_logs', 3000);
      expect(result).toBe(2555);
    });

    it('should allow -1 for indefinite retention', () => {
      const result = validateRetentionDays('events', -1);
      expect(result).toBe(-1);
    });

    it('should enforce minimum of 1 day', () => {
      const result = validateRetentionDays('events', 0);
      expect(result).toBe(1);
    });

    it('should enforce maximum of 2555 days', () => {
      const result = validateRetentionDays('events', 3000);
      expect(result).toBe(2555);
    });

    it('should pass through valid retention days', () => {
      expect(validateRetentionDays('events', 365)).toBe(365);
      expect(validateRetentionDays('sessions', 180)).toBe(180);
      expect(validateRetentionDays('analytics', 730)).toBe(730);
    });

    it('should allow user_data to be -1 (indefinite)', () => {
      const result = validateRetentionDays('user_data', -1);
      expect(result).toBe(-1);
    });
  });

  describe('calculateExpiryDate', () => {
    it('should return null for indefinite retention (-1)', () => {
      const result = calculateExpiryDate(-1);
      expect(result).toBeNull();
    });

    it('should calculate correct expiry date', () => {
      const referenceDate = new Date('2026-03-19');
      const result = calculateExpiryDate(365, referenceDate);

      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(2);
        expect(result.getDate()).toBe(19);
      }
    });

    it('should use current date as reference when not provided', () => {
      const result = calculateExpiryDate(0);
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle 7 year retention for audit logs', () => {
      const referenceDate = new Date('2026-03-19');
      const result = calculateExpiryDate(2555, referenceDate);

      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getFullYear()).toBe(2019);
      }
    });
  });

  describe('data categories coverage', () => {
    it('should have all expected data categories', () => {
      expect(dataCategories).toContain('events');
      expect(dataCategories).toContain('sessions');
      expect(dataCategories).toContain('analytics');
      expect(dataCategories).toContain('audit_logs');
      expect(dataCategories).toContain('user_data');
    });

    it('should have exactly 5 data categories', () => {
      expect(dataCategories).toHaveLength(5);
    });
  });

  describe('DEFAULT_RETENTION_DAYS', () => {
    it('should have correct default for events', () => {
      expect(DEFAULT_RETENTION_DAYS.events).toBe(365);
    });

    it('should have correct default for sessions', () => {
      expect(DEFAULT_RETENTION_DAYS.sessions).toBe(365);
    });

    it('should have correct default for analytics', () => {
      expect(DEFAULT_RETENTION_DAYS.analytics).toBe(730);
    });

    it('should have correct default for audit_logs (7 years)', () => {
      expect(DEFAULT_RETENTION_DAYS.audit_logs).toBe(2555);
    });

    it('should have -1 (indefinite) for user_data', () => {
      expect(DEFAULT_RETENTION_DAYS.user_data).toBe(-1);
    });
  });
});
