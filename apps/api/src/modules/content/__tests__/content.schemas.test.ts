import { describe, it, expect } from 'vitest';

import {
  threatLevelSchema,
  factionSchema,
  documentTypeSchema,
  emailTemplateSchema,
  scenarioSchema,
  scenarioBeatSchema,
  documentTemplateSchema,
  localizedContentSchema,
  createEmailTemplateBodySchema,
  scenarioListQuerySchema,
  documentTemplateListQuerySchema,
} from '@the-dmz/shared/schemas';

describe('Content Schemas', () => {
  describe('threatLevelSchema', () => {
    it('should accept valid threat levels', () => {
      expect(threatLevelSchema.parse('LOW')).toBe('LOW');
      expect(threatLevelSchema.parse('GUARDED')).toBe('GUARDED');
      expect(threatLevelSchema.parse('ELEVATED')).toBe('ELEVATED');
      expect(threatLevelSchema.parse('HIGH')).toBe('HIGH');
      expect(threatLevelSchema.parse('SEVERE')).toBe('SEVERE');
    });

    it('should reject invalid threat levels', () => {
      expect(() => threatLevelSchema.parse('invalid')).toThrow();
      expect(() => threatLevelSchema.parse('')).toThrow();
    });
  });

  describe('factionSchema', () => {
    it('should accept valid factions', () => {
      expect(factionSchema.parse('Sovereign Compact')).toBe('Sovereign Compact');
      expect(factionSchema.parse('Nexion Industries')).toBe('Nexion Industries');
      expect(factionSchema.parse('Librarians')).toBe('Librarians');
      expect(factionSchema.parse('Hacktivists')).toBe('Hacktivists');
      expect(factionSchema.parse('Criminal Networks')).toBe('Criminal Networks');
    });

    it('should reject invalid factions', () => {
      expect(() => factionSchema.parse('invalid')).toThrow();
    });
  });

  describe('documentTypeSchema', () => {
    it('should accept valid document types', () => {
      expect(documentTypeSchema.parse('EMAIL')).toBe('EMAIL');
      expect(documentTypeSchema.parse('PAW')).toBe('PAW');
      expect(documentTypeSchema.parse('VERIFICATION_PACKET')).toBe('VERIFICATION_PACKET');
      expect(documentTypeSchema.parse('THREAT_ASSESSMENT')).toBe('THREAT_ASSESSMENT');
      expect(documentTypeSchema.parse('INCIDENT_LOG')).toBe('INCIDENT_LOG');
      expect(documentTypeSchema.parse('DATA_SALVAGE_CONTRACT')).toBe('DATA_SALVAGE_CONTRACT');
      expect(documentTypeSchema.parse('STORAGE_LEASE')).toBe('STORAGE_LEASE');
      expect(documentTypeSchema.parse('UPGRADE_PROPOSAL')).toBe('UPGRADE_PROPOSAL');
      expect(documentTypeSchema.parse('BLACKLIST_NOTICE')).toBe('BLACKLIST_NOTICE');
      expect(documentTypeSchema.parse('WHITELIST_EXCEPTION')).toBe('WHITELIST_EXCEPTION');
      expect(documentTypeSchema.parse('FACILITY_REPORT')).toBe('FACILITY_REPORT');
      expect(documentTypeSchema.parse('INTELLIGENCE_BRIEF')).toBe('INTELLIGENCE_BRIEF');
      expect(documentTypeSchema.parse('RANSOM_NOTE')).toBe('RANSOM_NOTE');
    });

    it('should reject invalid document types', () => {
      expect(() => documentTypeSchema.parse('INVALID')).toThrow();
    });
  });

  describe('emailTemplateSchema', () => {
    it('should validate a complete email template', () => {
      const template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Email',
        subject: 'Test Subject',
        body: 'Test body content',
        fromName: 'Test Sender',
        fromEmail: 'test@example.com',
        replyTo: 'reply@example.com',
        contentType: 'phishing',
        difficulty: 3,
        faction: 'Sovereign Compact',
        attackType: 'spear_phishing',
        threatLevel: 'ELEVATED',
        season: 1,
        chapter: 2,
        language: 'en',
        locale: 'en-US',
        metadata: { key: 'value' },
        isAiGenerated: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(emailTemplateSchema.parse(template)).toEqual(template);
    });

    it('should validate with minimal fields', () => {
      const template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Email',
        subject: 'Test Subject',
        body: 'Test body content',
        contentType: 'phishing',
        difficulty: 3,
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

    it('should reject invalid difficulty', () => {
      const template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Email',
        subject: 'Test Subject',
        body: 'Test body content',
        contentType: 'phishing',
        difficulty: 6,
        threatLevel: 'LOW',
        language: 'en',
        locale: 'en-US',
        metadata: {},
        isAiGenerated: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(() => emailTemplateSchema.parse(template)).toThrow();
    });
  });

  describe('scenarioSchema', () => {
    it('should validate a complete scenario', () => {
      const scenario = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Scenario',
        description: 'A test scenario',
        difficulty: 3,
        faction: 'Nexion Industries',
        season: 1,
        chapter: 1,
        language: 'en',
        locale: 'en-US',
        metadata: {},
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(scenarioSchema.parse(scenario)).toEqual(scenario);
    });
  });

  describe('scenarioBeatSchema', () => {
    it('should validate a complete scenario beat', () => {
      const beat = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        scenarioId: '123e4567-e89b-12d3-a456-426614174001',
        tenantId: '123e4567-e89b-12d3-a456-426614174002',
        beatIndex: 0,
        dayOffset: 1,
        name: 'First Beat',
        description: 'The first beat',
        emailTemplateId: '123e4567-e89b-12d3-a456-426614174003',
        documentType: 'EMAIL',
        attackType: 'phishing',
        threatLevel: 'HIGH',
        requiredIndicators: ['indicator1'],
        optionalIndicators: ['indicator2'],
        metadata: {},
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(scenarioBeatSchema.parse(beat)).toEqual(beat);
    });
  });

  describe('documentTemplateSchema', () => {
    it('should validate a complete document template', () => {
      const template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Document',
        documentType: 'VERIFICATION_PACKET',
        title: 'Test Title',
        content: 'Test content',
        difficulty: 3,
        faction: 'Librarians',
        season: 1,
        chapter: 1,
        language: 'en',
        locale: 'en-US',
        metadata: {},
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(documentTemplateSchema.parse(template)).toEqual(template);
    });
  });

  describe('localizedContentSchema', () => {
    it('should validate localized content', () => {
      const content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
        contentKey: 'welcome_message',
        contentType: 'text',
        language: 'en',
        locale: 'en-US',
        content: 'Welcome to The DMZ!',
        metadata: {},
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(localizedContentSchema.parse(content)).toEqual(content);
    });
  });

  describe('createEmailTemplateBodySchema', () => {
    it('should validate a create email template request', () => {
      const input = {
        name: 'New Email',
        subject: 'New Subject',
        body: 'New body',
        contentType: 'legitimate',
        difficulty: 2,
        threatLevel: 'GUARDED',
      };

      expect(createEmailTemplateBodySchema.parse(input)).toMatchObject(input);
    });

    it('should apply defaults', () => {
      const input = {
        name: 'New Email',
        subject: 'New Subject',
        body: 'New body',
        contentType: 'legitimate',
        difficulty: 2,
        threatLevel: 'GUARDED',
      };

      const result = createEmailTemplateBodySchema.parse(input);
      expect(result.language).toBe('en');
      expect(result.locale).toBe('en-US');
    });
  });

  describe('scenarioListQuerySchema', () => {
    it('should validate scenario query parameters', () => {
      const query = {
        difficulty: 3,
        faction: 'Hacktivists',
        season: 1,
        isActive: true,
      };

      expect(scenarioListQuerySchema.parse(query)).toEqual(query);
    });

    it('should accept empty query', () => {
      expect(scenarioListQuerySchema.parse({})).toEqual({});
    });
  });

  describe('documentTemplateListQuerySchema', () => {
    it('should validate document template query parameters', () => {
      const query = {
        documentType: 'THREAT_ASSESSMENT',
        faction: 'Criminal Networks',
        locale: 'en-US',
        isActive: true,
      };

      expect(documentTemplateListQuerySchema.parse(query)).toEqual(query);
    });
  });
});
