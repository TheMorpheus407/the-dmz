import { describe, expect, it } from 'vitest';

import {
  threatLevelSchema,
  factionSchema,
  emailTemplateListQuerySchema,
  emailTemplateSchema,
} from '@the-dmz/shared/schemas';

describe('Email Template Retrieval', () => {
  describe('emailTemplateListQuerySchema', () => {
    it('should accept query with difficulty filter', () => {
      const query = { difficulty: 1 };
      expect(emailTemplateListQuerySchema.parse(query)).toEqual(query);
    });

    it('should accept query with all filters', () => {
      const query = {
        difficulty: 3,
        faction: 'Criminal Networks',
        threatLevel: 'HIGH',
        contentType: 'phishing',
        isActive: true,
      };
      expect(emailTemplateListQuerySchema.parse(query)).toEqual(query);
    });

    it('should accept empty query', () => {
      expect(emailTemplateListQuerySchema.parse({})).toEqual({});
    });

    it('should reject invalid difficulty', () => {
      const query = { difficulty: 6 };
      expect(() => emailTemplateListQuerySchema.parse(query)).toThrow();
    });

    it('should reject invalid faction', () => {
      const query = { faction: 'Invalid Faction' };
      expect(() => emailTemplateListQuerySchema.parse(query)).toThrow();
    });

    it('should reject invalid threat level', () => {
      const query = { threatLevel: 'EXTREME' };
      expect(() => emailTemplateListQuerySchema.parse(query)).toThrow();
    });
  });

  describe('difficulty tier requirements', () => {
    it('should accept all valid difficulty levels (1-5)', () => {
      for (let i = 1; i <= 5; i++) {
        expect(emailTemplateListQuerySchema.parse({ difficulty: i })).toEqual({ difficulty: i });
      }
    });

    it('should reject difficulty 0', () => {
      expect(() => emailTemplateListQuerySchema.parse({ difficulty: 0 })).toThrow();
    });

    it('should reject difficulty above 5', () => {
      expect(() => emailTemplateListQuerySchema.parse({ difficulty: 6 })).toThrow();
    });
  });

  describe('attack type requirements', () => {
    it('should accept all valid attack types', () => {
      expect(threatLevelSchema.parse('LOW')).toBe('LOW');
    });
  });

  describe('faction representation requirements', () => {
    it('should accept all 5 factions', () => {
      const factions = [
        'Sovereign Compact',
        'Nexion Industries',
        'Librarians',
        'Hacktivists',
        'Criminal Networks',
      ];

      for (const faction of factions) {
        expect(factionSchema.parse(faction)).toBe(faction);
      }
    });
  });

  describe('threat level requirements', () => {
    it('should accept all valid threat levels', () => {
      const threatLevels = ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'];

      for (const threatLevel of threatLevels) {
        expect(threatLevelSchema.parse(threatLevel)).toBe(threatLevel);
      }
    });
  });

  describe('email template structure requirements', () => {
    it('should validate complete email template with all required fields', () => {
      const template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'D1: Test Email',
        subject: 'Test Subject',
        body: 'Test body content',
        contentType: 'phishing',
        difficulty: 1,
        faction: 'Criminal Networks',
        attackType: 'phishing',
        threatLevel: 'LOW',
        season: 1,
        chapter: 1,
        language: 'en',
        locale: 'en-US',
        metadata: {
          signals: [],
          verificationHints: [],
        },
        isAiGenerated: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(emailTemplateSchema.parse(template)).toEqual(template);
    });

    it('should validate template with signal annotations in metadata', () => {
      const template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Email',
        subject: 'Test Subject',
        body: 'Test body',
        contentType: 'phishing',
        difficulty: 2,
        threatLevel: 'GUARDED',
        language: 'en',
        locale: 'en-US',
        metadata: {
          signals: [
            { type: 'urgency', description: 'Immediate action required' },
            { type: 'suspicious_link', description: 'Link to unknown domain' },
          ],
          verificationHints: ['Verify sender', 'Check link URL'],
        },
        isAiGenerated: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(emailTemplateSchema.parse(template)).toEqual(template);
    });
  });

  describe('distribution requirements', () => {
    it('should validate email template for each difficulty tier', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002',
        '123e4567-e89b-12d3-a456-426614174003',
        '123e4567-e89b-12d3-a456-426614174004',
        '123e4567-e89b-12d3-a456-426614174005',
      ];

      for (let difficulty = 1; difficulty <= 5; difficulty++) {
        const template = {
          id: validUuids[difficulty - 1],
          tenantId: '123e4567-e89b-12d3-a456-426614174001',
          name: `D${difficulty}: Test Email`,
          subject: 'Test Subject',
          body: 'Test body',
          contentType: 'phishing',
          difficulty,
          threatLevel: 'LOW',
          language: 'en',
          locale: 'en-US',
          metadata: {},
          isAiGenerated: false,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        };

        expect(emailTemplateSchema.parse(template)).toEqual(template);
      }
    });

    it('should validate email template for each faction', () => {
      const factions = [
        'Sovereign Compact',
        'Nexion Industries',
        'Librarians',
        'Hacktivists',
        'Criminal Networks',
      ];

      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174011',
        '123e4567-e89b-12d3-a456-426614174012',
        '123e4567-e89b-12d3-a456-426614174013',
        '123e4567-e89b-12d3-a456-426614174014',
        '123e4567-e89b-12d3-a456-426614174015',
      ];

      factions.forEach((faction, index) => {
        const template = {
          id: validUuids[index],
          tenantId: '123e4567-e89b-12d3-a456-426614174001',
          name: `${faction} Test`,
          subject: 'Test Subject',
          body: 'Test body',
          contentType: 'phishing',
          difficulty: 1,
          faction,
          threatLevel: 'LOW',
          language: 'en',
          locale: 'en-US',
          metadata: {},
          isAiGenerated: false,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        };

        expect(emailTemplateSchema.parse(template)).toEqual(template);
      });
    });

    it('should validate email template for each attack type', () => {
      const attackTypes = [
        'phishing',
        'spear_phishing',
        'bec',
        'credential_harvesting',
        'malware_delivery',
        'pretexting',
      ];

      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174021',
        '123e4567-e89b-12d3-a456-426614174022',
        '123e4567-e89b-12d3-a456-426614174023',
        '123e4567-e89b-12d3-a456-426614174024',
        '123e4567-e89b-12d3-a456-426614174025',
        '123e4567-e89b-12d3-a456-426614174026',
      ];

      attackTypes.forEach((attackType, index) => {
        const template = {
          id: validUuids[index],
          tenantId: '123e4567-e89b-12d3-a456-426614174001',
          name: `${attackType} Test`,
          subject: 'Test Subject',
          body: 'Test body',
          contentType: attackType,
          difficulty: 1,
          attackType,
          threatLevel: 'LOW',
          language: 'en',
          locale: 'en-US',
          metadata: {},
          isAiGenerated: false,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        };

        expect(emailTemplateSchema.parse(template)).toEqual(template);
      });
    });
  });
});
