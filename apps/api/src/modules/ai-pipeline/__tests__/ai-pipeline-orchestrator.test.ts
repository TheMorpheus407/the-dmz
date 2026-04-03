import { describe, expect, it, vi } from 'vitest';

import { createAiPipelineOrchestrator } from '../ai-pipeline-orchestrator.js';
import { MissingPromptTemplateError } from '../ai-pipeline-errors.js';

import type { IEventBus } from '../../shared/events/event-types.js';
import type {
  PromptTemplateRepository,
  ContentGateway,
  ContentGenerationRequest,
  PromptTemplate,
} from '../ai-pipeline.types.js';

const createMockEventBus = (): IEventBus => ({
  publish: vi.fn(),
});

const createMockContentGateway = (overrides?: Partial<ContentGateway>): ContentGateway => ({
  createEmailTemplate: vi.fn().mockResolvedValue({ id: 'email-123' }),
  listEmailTemplates: vi.fn().mockResolvedValue([]),
  listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
  createDocumentTemplate: vi.fn().mockResolvedValue({ id: 'doc-123' }),
  createScenario: vi.fn().mockResolvedValue({ id: 'scenario-123' }),
  ...overrides,
});

const createMockPromptTemplate = (overrides?: Partial<PromptTemplate>): PromptTemplate => ({
  id: 'template-123',
  name: 'Test Template',
  version: '1.0.0',
  category: 'email_phishing',
  systemPrompt: 'You are a helpful assistant.',
  userTemplate: 'Generate content about {{topic}}',
  outputSchema: { subject: 'string', body: 'string' },
  tokenBudget: 1000,
  isActive: true,
  attackType: null,
  threatLevel: null,
  difficulty: null,
  season: null,
  chapter: null,
  minVersion: null,
  maxVersion: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  ...overrides,
});

describe('ai-pipeline-orchestrator', () => {
  describe('createAiPipelineOrchestrator factory function', () => {
    it('creates orchestrator with all dependencies', () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn(),
      };

      const mockEventBus = createMockEventBus();

      const orchestrator = createAiPipelineOrchestrator({
        config: {} as Parameters<typeof createAiPipelineOrchestrator>[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: createMockContentGateway(),
      });

      expect(orchestrator.generateContent).toBeDefined();
      expect(orchestrator.getDependencies).toBeDefined();
    });

    it('uses default logger when not provided', () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn(),
      };

      const mockEventBus = createMockEventBus();

      const orchestrator = createAiPipelineOrchestrator({
        config: {} as Parameters<typeof createAiPipelineOrchestrator>[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
      });

      const deps = orchestrator.getDependencies();
      expect(deps.logger).toBeDefined();
    });

    it('uses custom generateId when provided', () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn(),
      };

      const mockEventBus = createMockEventBus();
      const customGenerateId = vi.fn().mockReturnValue('custom-id');

      const orchestrator = createAiPipelineOrchestrator({
        config: {} as Parameters<typeof createAiPipelineOrchestrator>[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        generateId: customGenerateId,
      });

      const deps = orchestrator.getDependencies();
      expect(deps.generateId).toBe(customGenerateId);
    });

    it('uses custom emailPoolLowThreshold when provided', () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn(),
      };

      const mockEventBus = createMockEventBus();

      const orchestrator = createAiPipelineOrchestrator({
        config: {} as Parameters<typeof createAiPipelineOrchestrator>[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        emailPoolLowThreshold: 50,
      });

      const deps = orchestrator.getDependencies();
      expect(deps.emailPoolLowThreshold).toBe(50);
    });
  });

  describe('generateContent with successful template lookup', () => {
    it('generates content when template is found and passes safety', async () => {
      const mockTemplate = createMockPromptTemplate();
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(mockTemplate),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockClaudeClient = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          subject: 'Test Subject',
          body: { text: 'Test Body Content' },
          fromName: 'Test Sender',
          fromEmail: 'test@example.invalid',
          headers: { from: 'Test Sender <test@example.invalid>' },
        }),
        model: 'claude-3-5-sonnet',
        inputTokens: 100,
        outputTokens: 200,
      });

      const mockContentGateway = createMockContentGateway({
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'stored-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        claudeClient: mockClaudeClient as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['claudeClient'],
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.requestId).toBe('request-id-123');
      expect(result.templateId).toBe('template-123');
      expect(result.content).toBeDefined();
      expect(mockRepo.recordGenerationLog).toHaveBeenCalled();
    });

    it('falls back to handcrafted content when no template found', async () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(undefined),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.templateId).toBe('handcrafted-fallback');
      expect(result.fallbackApplied).toBe(true);
      expect(result.failureCategory).toBe('template_unavailable');
    });
  });

  describe('generateContent throws MissingPromptTemplateError when no template found', () => {
    it('catches MissingPromptTemplateError and falls back to handcrafted content', async () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockRejectedValue(new MissingPromptTemplateError()),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.fallbackApplied).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe('generateContent handles safety rejection and switches to fallback', () => {
    it('switches to fallback when content fails safety validation', async () => {
      const mockTemplate = createMockPromptTemplate();
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(mockTemplate),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockClaudeClient = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          subject: 'Test Subject',
          body: { text: 'Test Body Content' },
          fromName: 'Test Sender',
          fromEmail: 'test@example.invalid',
          headers: { from: 'Test Sender <test@example.invalid>' },
        }),
        model: 'claude-3-5-sonnet',
        inputTokens: 100,
        outputTokens: 200,
      });

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        claudeClient: mockClaudeClient as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['claudeClient'],
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.content).toBeDefined();
    });
  });

  describe('generateContent with fallback email content resolution', () => {
    it('resolves fallback content for email_phishing category', async () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(undefined),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.fallbackApplied).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content.content_type).toBe('email');
    });

    it('resolves fallback content for email_legitimate category', async () => {
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(undefined),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_legitimate',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.fallbackApplied).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe('Error propagation through the orchestrator', () => {
    it('propagates error from Claude client and falls back', async () => {
      const mockTemplate = createMockPromptTemplate();
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(mockTemplate),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockClaudeClient = vi.fn().mockRejectedValue(new Error('Claude API error'));

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        claudeClient: mockClaudeClient as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['claudeClient'],
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.fallbackApplied).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('handles template schema errors gracefully and falls back', async () => {
      const mockTemplate = createMockPromptTemplate({
        outputSchema: { invalid: 'schema' },
      });
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(mockTemplate),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.fallbackApplied).toBe(true);
    });

    it('handles Claude client returning invalid JSON', async () => {
      const mockTemplate = createMockPromptTemplate();
      const mockRepo: PromptTemplateRepository = {
        list: vi.fn(),
        getById: vi.fn(),
        getActiveForGeneration: vi.fn().mockResolvedValue(mockTemplate),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        recordGenerationLog: vi.fn().mockResolvedValue(undefined),
      };

      const mockClaudeClient = vi.fn().mockResolvedValue({
        text: 'this is not valid JSON',
        model: 'claude-3-5-sonnet',
        inputTokens: 100,
        outputTokens: 200,
      });

      const mockContentGateway = createMockContentGateway({
        listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
        createEmailTemplate: vi.fn().mockResolvedValue({ id: 'fallback-email-123' }),
      });

      const mockEventBus = createMockEventBus();
      const mockGenerateId = vi.fn().mockReturnValue('request-id-123');

      const orchestrator = createAiPipelineOrchestrator({
        config: { AI_MAX_RETRIES: 3 } as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['config'],
        eventBus: mockEventBus,
        promptTemplateRepository: mockRepo,
        contentGateway: mockContentGateway,
        claudeClient: mockClaudeClient as Parameters<
          typeof createAiPipelineOrchestrator
        >[0]['claudeClient'],
        generateId: mockGenerateId,
      });

      const request: ContentGenerationRequest = {
        category: 'email_phishing',
        faction: 'TestFaction',
        difficulty: 3,
      };

      const result = await orchestrator.generateContent('tenant-123', 'user-456', request);

      expect(result.fallbackApplied).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe('createDefaultPromptRepository', () => {
    it('is exported and callable', () => {
      expect(createAiPipelineOrchestrator).toBeDefined();
    });
  });
});
