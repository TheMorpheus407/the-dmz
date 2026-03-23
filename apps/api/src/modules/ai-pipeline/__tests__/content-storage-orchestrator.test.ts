import { describe, expect, it, vi } from 'vitest';

import {
  createContentStorageOrchestrator,
  parseMailboxHeader,
  deriveSenderNameFromSignature,
  deriveSenderNameFromAddress,
  type StorageOptions,
} from '../content-storage-orchestrator.js';

import type { ContentGateway, GeneratedContentResult, UsageMetrics } from '../ai-pipeline.types.js';

const createMockContentGateway = (): ContentGateway => {
  const emailTemplates: Array<{ id: string }> = [];
  const documents: Array<{ id: string }> = [];
  const scenarios: Array<{ id: string }> = [];

  return {
    createEmailTemplate: vi.fn().mockImplementation(async (_tenantId, input) => {
      const id = `email-${emailTemplates.length + 1}`;
      emailTemplates.push({ id });
      return {
        id,
        tenantId: _tenantId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<ContentGateway['createEmailTemplate']> extends Promise<infer T> ? T : never;
    }),
    listEmailTemplates: vi.fn().mockResolvedValue([]),
    listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
    createDocumentTemplate: vi.fn().mockImplementation(async (_tenantId, input) => {
      const id = `doc-${documents.length + 1}`;
      documents.push({ id });
      return {
        id,
        tenantId: _tenantId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<ContentGateway['createDocumentTemplate']> extends Promise<infer T>
        ? T
        : never;
    }),
    createScenario: vi.fn().mockImplementation(async (_tenantId, input) => {
      const id = `scenario-${scenarios.length + 1}`;
      scenarios.push({ id });
      return {
        id,
        tenantId: _tenantId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReturnType<ContentGateway['createScenario']> extends Promise<infer T> ? T : never;
    }),
  };
};

const mockQuality: GeneratedContentResult['quality'] = {
  score: 0.85,
  breakdown: {
    plausibility: 0.9,
    signalClarity: 0.8,
    variety: 0.85,
    pedagogicalValue: 0.85,
    narrativeAlignment: 0.9,
  },
};

const mockDifficulty: GeneratedContentResult['difficulty'] = {
  difficulty: 4,
  source: 'model',
  rationale: 'Test difficulty',
  usage: {},
};

const mockSafety: GeneratedContentResult['safety'] = {
  ok: true,
  flags: [],
  findings: [],
};

const mockUsage: UsageMetrics = {
  inputTokens: 100,
  outputTokens: 200,
  latencyMs: 500,
  estimatedCostUsd: 0.01,
};

describe('content-storage-orchestrator', () => {
  describe('parseMailboxHeader', () => {
    it('parses mailbox header with display name and address', () => {
      const result = parseMailboxHeader('John Doe <john.doe@example.com>');
      expect(result.address).toBe('john.doe@example.com');
      expect(result.displayName).toBe('John Doe');
    });

    it('parses mailbox header with address only', () => {
      const result = parseMailboxHeader('john.doe@example.com');
      expect(result.address).toBe('john.doe@example.com');
      expect(result.displayName).toBeNull();
    });

    it('returns null for empty input', () => {
      const result = parseMailboxHeader(undefined);
      expect(result.address).toBeNull();
      expect(result.displayName).toBeNull();
    });

    it('parses quoted display names', () => {
      const result = parseMailboxHeader('"John Doe" <john.doe@example.com>');
      expect(result.address).toBe('john.doe@example.com');
      expect(result.displayName).toBe('John Doe');
    });

    it('handles single quotes in display names', () => {
      const result = parseMailboxHeader("'Jane Smith' <jane@example.com>");
      expect(result.address).toBe('jane@example.com');
      expect(result.displayName).toBe('Jane Smith');
    });
  });

  describe('deriveSenderNameFromSignature', () => {
    it('derives sender name from signature', () => {
      const content = {
        body: {
          signature: 'Nexion Industries, Security Team',
        },
      };
      const result = deriveSenderNameFromSignature(content);
      expect(result).toBe('Nexion Industries');
    });

    it('returns null for missing signature', () => {
      const content = { body: {} };
      const result = deriveSenderNameFromSignature(content);
      expect(result).toBeNull();
    });
  });

  describe('deriveSenderNameFromAddress', () => {
    it('derives sender name from email address', () => {
      const result = deriveSenderNameFromAddress('john.doe@example.com');
      expect(result).toBe('John Doe');
    });

    it('handles addresses with dots and underscores', () => {
      const result = deriveSenderNameFromAddress('john_doe@example.com');
      expect(result).toBe('John Doe');
    });

    it('returns null for invalid address', () => {
      const result = deriveSenderNameFromAddress(null);
      expect(result).toBeNull();
    });
  });

  describe('storeGeneratedContent', () => {
    const tenantId = 'test-tenant-id';
    const requestId = 'test-request-id';
    const templateName = 'Test Template';

    const baseRequest = {
      category: 'email_phishing' as const,
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH' as const,
      difficulty: 4,
      season: 1,
      chapter: 2,
      language: 'en',
      locale: 'en-US',
    };

    const resolvedContext = {
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 2,
      language: 'en',
      locale: 'en-US',
    };

    it('stores email content correctly', async () => {
      const gateway = createMockContentGateway();
      const orchestrator = createContentStorageOrchestrator(gateway);

      const content = {
        headers: {
          subject: 'Test Email',
          from: 'John Doe <sender@example.com>',
          reply_to: 'reply@example.com',
        },
        body: {
          summary: 'Test summary',
          justification: 'Test justification',
          call_to_action: 'Click here',
        },
        faction: 'Nexion Industries',
      };

      const opts: StorageOptions = {
        tenantId,
        requestId,
        templateName,
        request: baseRequest,
        resolvedContext,
        content,
        quality: mockQuality,
        difficulty: mockDifficulty,
        safety: mockSafety,
        model: 'claude-3-5-sonnet',
        fallbackApplied: false,
        usage: mockUsage,
      };

      const result = await orchestrator.storeGeneratedContent(opts);

      expect(result.kind).toBe('email');
      expect(gateway.createEmailTemplate).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          name: `${templateName} generated ${requestId}`,
          subject: 'Test Email',
          fromName: 'John Doe',
          fromEmail: 'sender@example.com',
          contentType: 'email_phishing',
          difficulty: 4,
          faction: 'Nexion Industries',
        }),
      );
    });

    it('stores intel brief content correctly', async () => {
      const gateway = createMockContentGateway();
      const orchestrator = createContentStorageOrchestrator(gateway);

      const intelRequest = {
        ...baseRequest,
        category: 'intel_brief' as const,
      };

      const content = {
        title: 'Intelligence Brief',
        body: 'Brief content',
        summary: 'Brief summary',
      };

      const opts: StorageOptions = {
        tenantId,
        requestId,
        templateName,
        request: intelRequest,
        resolvedContext,
        content,
        quality: mockQuality,
        difficulty: mockDifficulty,
        safety: mockSafety,
        model: 'claude-3-5-sonnet',
        fallbackApplied: false,
        usage: mockUsage,
      };

      const result = await orchestrator.storeGeneratedContent(opts);

      expect(result.kind).toBe('document');
      expect(gateway.createDocumentTemplate).toHaveBeenCalled();
    });

    it('stores scenario content correctly', async () => {
      const gateway = createMockContentGateway();
      const orchestrator = createContentStorageOrchestrator(gateway);

      const scenarioRequest = {
        ...baseRequest,
        category: 'scenario_variation' as const,
      };

      const content = {
        summary: 'Scenario summary',
        description: 'Scenario description',
      };

      const opts: StorageOptions = {
        tenantId,
        requestId,
        templateName,
        request: scenarioRequest,
        resolvedContext,
        content,
        quality: mockQuality,
        difficulty: mockDifficulty,
        safety: mockSafety,
        model: 'claude-3-5-sonnet',
        fallbackApplied: false,
        usage: mockUsage,
      };

      const result = await orchestrator.storeGeneratedContent(opts);

      expect(result.kind).toBe('scenario');
      expect(gateway.createScenario).toHaveBeenCalled();
    });

    it('uses fallback content name when request.contentName is not provided', async () => {
      const gateway = createMockContentGateway();
      const orchestrator = createContentStorageOrchestrator(gateway);

      const content = {
        headers: {
          subject: 'Test Email',
          from: 'sender@example.com',
        },
        body: {},
      };

      const opts: StorageOptions = {
        tenantId,
        requestId,
        templateName,
        request: baseRequest,
        resolvedContext,
        content,
        quality: mockQuality,
        difficulty: mockDifficulty,
        safety: mockSafety,
        model: 'claude-3-5-sonnet',
        fallbackApplied: false,
        usage: mockUsage,
      };

      await orchestrator.storeGeneratedContent(opts);

      expect(gateway.createEmailTemplate).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          name: `${templateName} generated ${requestId}`,
        }),
      );
    });

    it('uses request.contentName when provided', async () => {
      const gateway = createMockContentGateway();
      const orchestrator = createContentStorageOrchestrator(gateway);

      const requestWithContentName = {
        ...baseRequest,
        contentName: 'My Custom Content',
      };

      const content = {
        headers: {
          subject: 'Test Email',
          from: 'sender@example.com',
        },
        body: {},
      };

      const opts: StorageOptions = {
        tenantId,
        requestId,
        templateName,
        request: requestWithContentName,
        resolvedContext,
        content,
        quality: mockQuality,
        difficulty: mockDifficulty,
        safety: mockSafety,
        model: 'claude-3-5-sonnet',
        fallbackApplied: false,
        usage: mockUsage,
      };

      await orchestrator.storeGeneratedContent(opts);

      expect(gateway.createEmailTemplate).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          name: 'My Custom Content',
        }),
      );
    });
  });
});
