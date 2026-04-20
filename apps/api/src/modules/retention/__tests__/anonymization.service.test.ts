import { describe, it, expect, beforeEach } from 'vitest';

import {
  AnonymizationService,
  anonymizationService,
  type AnonymizationConfig,
} from '../anonymization.service.js';

describe('AnonymizationService', () => {
  let service: AnonymizationService;

  beforeEach(() => {
    service = new AnonymizationService({}, 'test-salt-12345');
  });

  describe('constructor', () => {
    it('should use provided salt', () => {
      const customSalt = 'my-custom-salt';
      const service = new AnonymizationService({}, customSalt);
      expect(service).toBeDefined();
    });

    it('should use default salt when none provided', () => {
      const service = new AnonymizationService();
      expect(service).toBeDefined();
    });

    it('should apply custom config', () => {
      const config: Partial<AnonymizationConfig> = {
        defaultMethod: 'hash',
        rules: [{ field: 'customField', method: 'redact' }],
      };
      const service = new AnonymizationService(config);
      const rules = service.getRules();
      expect(rules.some((r) => r.field === 'customField')).toBe(true);
    });
  });

  describe('anonymize', () => {
    it('should anonymize email field', () => {
      const data = { email: 'user@example.com', name: 'John' };
      const result = service.anonymize(data);

      expect(result.anonymized['email']).not.toBe('user@example.com');
      expect(result.anonymized['email']).toContain('anon_');
      expect(result.fieldsAnonymized).toContain('email');
    });

    it('should anonymize ipAddress field', () => {
      const data = { ipAddress: '192.168.1.1' };
      const result = service.anonymize(data);

      expect(result.anonymized['ipAddress']).toContain('REDACTED_');
      expect(result.fieldsAnonymized).toContain('ipAddress');
    });

    it('should anonymize name field', () => {
      const data = { name: 'John Doe' };
      const result = service.anonymize(data);

      expect(result.anonymized['name']).toContain('USER_');
      expect(result.fieldsAnonymized).toContain('name');
    });

    it('should nullify ssn field', () => {
      const data = { ssn: '123-45-6789' };
      const result = service.anonymize(data);

      expect(result.anonymized['ssn']).toBeNull();
      expect(result.fieldsAnonymized).toContain('ssn');
    });

    it('should anonymize nested PII in payload', () => {
      const data = {
        payload: {
          email: 'nested@example.com',
          ip: '10.0.0.1',
        },
      };
      const result = service.anonymize(data);

      expect(result.fieldsAnonymized).toContain('payload.email');
      expect(result.fieldsAnonymized).toContain('payload.ip');
    });

    it('should not modify fields not in rules', () => {
      const data = { id: '12345', status: 'active' };
      const result = service.anonymize(data);

      expect(result.anonymized['id']).toBe('12345');
      expect(result.anonymized['status']).toBe('active');
      expect(result.fieldsAnonymized).toHaveLength(0);
    });

    it('should handle missing fields gracefully', () => {
      const data = { name: 'John' };
      const result = service.anonymize(data);

      expect(result.anonymized['name']).toBeDefined();
    });
  });

  describe('anonymizeUserId', () => {
    it('should return hashed user id with prefix', () => {
      const result = service.anonymizeUserId('user-123');
      expect(result).toContain('anon_');
      expect(result).not.toBe('user-123');
    });

    it('should return consistent hash for same input', () => {
      const result1 = service.anonymizeUserId('user-123');
      const result2 = service.anonymizeUserId('user-123');
      expect(result1).toBe(result2);
    });
  });

  describe('anonymizeEmail', () => {
    it('should anonymize email with proper format', () => {
      const result = service.anonymizeEmail('test@example.com');
      expect(result).toMatch(/^anon_[a-f0-9]+@anonymized\.invalid$/);
    });
  });

  describe('anonymizeIpAddress', () => {
    it('should redact IP address', () => {
      const result = service.anonymizeIpAddress('192.168.1.1');
      expect(result).toContain('REDACTED_');
    });
  });

  describe('createAnonymizedUserIdMapping', () => {
    it('should create mapping with original and anonymized IDs', () => {
      const mapping = service.createAnonymizedUserIdMapping('user-456');

      expect(mapping.originalId).toBe('user-456');
      expect(mapping.anonymizedId).toContain('anon_');
      expect(mapping.mappingKey).toBeDefined();
      expect(mapping.mappingKey.length).toBeGreaterThan(0);
    });
  });

  describe('validateAnonymization', () => {
    it('should detect remaining PII email', () => {
      const data = { email: 'user@example.com' };
      const result = service.validateAnonymization(data);

      expect(result.isValid).toBe(false);
      expect(result.remainingPii).toContain('email');
    });

    it('should flag anonymized email format as still matching email pattern', () => {
      const data = { email: 'anon_123456@anonymized.invalid' };
      const result = service.validateAnonymization(data);

      expect(result.isValid).toBe(false);
      expect(result.remainingPii).toContain('email');
    });

    it('should detect remaining PII IP', () => {
      const data = { ipAddress: '192.168.1.1' };
      const result = service.validateAnonymization(data);

      expect(result.isValid).toBe(false);
      expect(result.remainingPii).toContain('ipAddress');
    });

    it('should detect remaining SSN pattern', () => {
      const data = { ssn: '123-45-6789' };
      const result = service.validateAnonymization(data);

      expect(result.isValid).toBe(false);
      expect(result.remainingPii).toContain('ssn');
    });

    it('should pass for data without PII patterns', () => {
      const data = { id: '123', status: 'active' };
      const result = service.validateAnonymization(data);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getRules', () => {
    it('should return copy of rules', () => {
      const rules = service.getRules();
      rules.push({ field: 'test', method: 'null' });

      const rules2 = service.getRules();
      expect(rules2.some((r) => r.field === 'test')).toBe(false);
    });
  });

  describe('addRule', () => {
    it('should add new rule', () => {
      service.addRule({ field: 'newField', method: 'redact' });
      const rules = service.getRules();

      expect(rules.some((r) => r.field === 'newField')).toBe(true);
    });

    it('should update existing rule', () => {
      service.addRule({ field: 'email', method: 'null' });
      const rules = service.getRules();
      const emailRule = rules.find((r) => r.field === 'email');

      expect(emailRule?.method).toBe('null');
    });
  });

  describe('didRemoveRule', () => {
    it('should remove existing rule', () => {
      service.didRemoveRule('email');
      const rules = service.getRules();

      expect(rules.some((r) => r.field === 'email')).toBe(false);
    });

    it('should return false for non-existent rule', () => {
      const result = service.didRemoveRule('nonExistent');
      expect(result).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('should be callable without error', () => {
      expect(() => service.resetToDefaults()).not.toThrow();
    });

    it('should return rules array after reset', () => {
      service.resetToDefaults();
      const rules = service.getRules();
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('instance exports', () => {
    it('should export default anonymizationService', () => {
      expect(anonymizationService).toBeDefined();
      expect(anonymizationService.anonymize).toBeDefined();
    });
  });
});
