import { describe, expect, it, vi } from 'vitest';

import { loadConfig, type AppConfig } from '../../../config.js';
import { createAiPipelineService } from '../ai-pipeline.service.js';
import { getDefaultOutputSchema } from '../output-parser.service.js';

import type {
  AiPipelineLogger,
  ClaudeClient,
  ContentGateway,
  PromptTemplateRepository,
} from '../ai-pipeline.types.js';

const createTestConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ANTHROPIC_API_KEY: 'test-key',
    ...overrides,
  };
};

const logger: AiPipelineLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const emailTemplate = {
  id: '9d6140a2-96e3-4bc8-a468-60ccf4f9c300',
  tenantId: '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
  name: 'Email Phishing Template',
  category: 'email_phishing',
  description: 'Test template',
  attackType: 'spear_phishing',
  threatLevel: 'HIGH',
  difficulty: 4,
  season: 1,
  chapter: 2,
  systemPrompt: 'Generate JSON only.',
  userTemplate: 'Generate a phishing email for {{faction}} using {{attackType}}.',
  outputSchema: getDefaultOutputSchema('email_phishing'),
  version: '1.0.0',
  tokenBudget: 1200,
  isActive: true,
  metadata: {},
  createdAt: new Date('2026-03-01T00:00:00Z'),
  updatedAt: new Date('2026-03-01T00:00:00Z'),
} as const;

const intelTemplate = {
  ...emailTemplate,
  id: '97fc6217-1313-4bc0-b5f8-f2448b96b5f3',
  name: 'Intel Brief Template',
  category: 'intel_brief',
  attackType: null,
  threatLevel: 'HIGH',
  difficulty: 3,
  season: 1,
  chapter: null,
  userTemplate: 'Generate an intelligence brief for {{threatLevel}}.',
  outputSchema: getDefaultOutputSchema('intel_brief'),
} as const;

const scenarioTemplate = {
  ...emailTemplate,
  id: '0ec8195d-f13c-4f60-bf40-2dfca24b6975',
  name: 'Scenario Variation Template',
  category: 'scenario_variation',
  attackType: 'supply_chain',
  threatLevel: 'ELEVATED',
  difficulty: 4,
  season: 2,
  chapter: null,
  userTemplate: 'Generate a scenario variation for {{attackType}}.',
  outputSchema: getDefaultOutputSchema('scenario_variation'),
} as const;

const generatedEmail = {
  content_type: 'email',
  headers: {
    from: 'liaison@nexion.invalid',
    to: 'intake@archive.invalid',
    subject: 'Urgent Credential Refresh',
    date: '2063-09-14T14:22:00Z',
    message_id: '<msg-7742@nexion.invalid>',
    reply_to: 'liaison@nexion.invalid',
    spf: 'fail',
    dkim: 'neutral',
    dmarc: 'fail',
  },
  body: {
    greeting: 'Director,',
    summary: 'A priority credential refresh is required immediately.',
    justification: 'The overnight relay swap invalidated your current archive token.',
    call_to_action: 'Open the verification portal now to prevent access loss.',
    signature: 'Relay Office, Nexion',
  },
  links: [
    {
      label: 'Verification Portal',
      url: 'https://verify.nexion.invalid/portal',
      is_suspicious: true,
    },
  ],
  attachments: [{ name: 'relay_notice.pdf', type: 'pdf', is_suspicious: false }],
  signals: [
    {
      type: 'urgency',
      location: 'body.call_to_action',
      explanation: 'Immediate action is demanded without a normal approval window.',
    },
  ],
  safety_flags: ['ok'],
};

const generatedIntelBrief = {
  content_type: 'intel_brief',
  executive_summary: 'Archive intake procedures are being probed by a coordinated campaign.',
  observed_indicators: ['Urgent sender claims', 'Unexpected credential refresh language'],
  expected_adversary_tactics: ['spear_phishing', 'credential_harvesting'],
  recommended_posture: 'Require offline verification before approving any escalated request.',
  safety_flags: ['ok'],
};

const generatedScenarioVariation = {
  content_type: 'scenario_variation',
  name: 'Relay trust erosion',
  summary: 'A staged supply-chain probe escalates through trusted maintenance channels.',
  trigger_conditions: ['Threat level is ELEVATED', 'Player approves a maintenance request'],
  required_deliverables: ['email_wave', 'intel_brief'],
  follow_up_triggers: ['verification_requested'],
  safety_flags: ['ok'],
};

const createRepository = (): PromptTemplateRepository => ({
  list: vi.fn().mockResolvedValue([emailTemplate, intelTemplate, scenarioTemplate]),
  getById: vi.fn().mockResolvedValue(emailTemplate),
  getActiveForGeneration: vi.fn().mockImplementation(async (_tenantId, selector) => {
    if (selector.category === 'intel_brief') {
      return intelTemplate;
    }
    if (selector.category === 'scenario_variation') {
      return scenarioTemplate;
    }

    return emailTemplate;
  }),
  create: vi.fn().mockResolvedValue(emailTemplate),
  update: vi.fn().mockResolvedValue(emailTemplate),
  delete: vi.fn().mockResolvedValue(true),
  recordGenerationLog: vi.fn().mockResolvedValue(undefined),
});

const createContentGateway = (): ContentGateway => ({
  createEmailTemplate: vi.fn().mockResolvedValue({ id: 'email-template-1' }),
  listEmailTemplates: vi.fn().mockResolvedValue([]),
  listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
  createDocumentTemplate: vi.fn().mockResolvedValue({ id: 'document-template-1' }),
  createScenario: vi.fn().mockResolvedValue({ id: 'scenario-1' }),
});

const createEventBus = () => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

describe('ai-pipeline.service', () => {
  it('rejects prompt template creation when outputSchema is missing', async () => {
    const repository = createRepository();
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-create-template',
    });
    const invalidInput = {
      name: 'Missing schema template',
      category: 'email_phishing',
      systemPrompt: 'Generate JSON only.',
      userTemplate: 'Generate a phishing email.',
      version: '1.0.0',
    } as unknown as Parameters<typeof service.createPromptTemplate>[1];

    expect(() => service.createPromptTemplate(emailTemplate.tenantId, invalidInput)).toThrow(
      'Prompt template outputSchema is required and must define at least one schema rule',
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects prompt template creation when outputSchema is not a compilable JSON schema', async () => {
    const repository = createRepository();
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-create-invalid-schema',
    });
    const invalidInput = {
      name: 'Invalid schema template',
      category: 'email_phishing',
      systemPrompt: 'Generate JSON only.',
      userTemplate: 'Generate a phishing email.',
      outputSchema: {
        type: 'definitely-not-a-real-json-schema-type',
      },
      version: '1.0.0',
    } as unknown as Parameters<typeof service.createPromptTemplate>[1];

    expect(() => service.createPromptTemplate(emailTemplate.tenantId, invalidInput)).toThrow(
      /Prompt template outputSchema must be a valid JSON schema/i,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects prompt template creation when outputSchema does not match the category contract', async () => {
    const repository = createRepository();
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-create-schema-mismatch',
    });
    const invalidInput = {
      name: 'Incompatible email schema template',
      category: 'email_phishing',
      systemPrompt: 'Generate JSON only.',
      userTemplate: 'Generate a phishing email.',
      outputSchema: {
        type: 'object',
        required: ['foo'],
        additionalProperties: false,
        properties: {
          foo: { type: 'string' },
        },
      },
      version: '1.0.0',
    } as unknown as Parameters<typeof service.createPromptTemplate>[1];

    expect(() => service.createPromptTemplate(emailTemplate.tenantId, invalidInput)).toThrow(
      /canonical schema for category email_phishing/i,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('maps duplicate prompt template creation failures to a conflict app error', async () => {
    const repository = createRepository();
    vi.mocked(repository.create).mockRejectedValue({
      code: '23505',
      constraint_name: 'ai_prompt_templates_name_version_idx',
    });
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-create-conflict',
    });

    await expect(
      service.createPromptTemplate(emailTemplate.tenantId, {
        name: emailTemplate.name,
        category: 'email_phishing',
        systemPrompt: emailTemplate.systemPrompt,
        userTemplate: emailTemplate.userTemplate,
        outputSchema: getDefaultOutputSchema('email_phishing'),
        version: emailTemplate.version,
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
      message: 'A prompt template with this name and version already exists',
      details: expect.objectContaining({
        resource: 'prompt_template',
        conflictFields: ['name', 'version'],
        name: emailTemplate.name,
        version: emailTemplate.version,
      }),
    });
  });

  it('rejects prompt template updates when a replacement outputSchema does not match the stored category contract', async () => {
    const repository = createRepository();
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-update-schema-mismatch',
    });

    await expect(
      service.updatePromptTemplate(emailTemplate.tenantId, emailTemplate.id, {
        outputSchema: {
          type: 'object',
          required: ['foo'],
          additionalProperties: false,
          properties: {
            foo: { type: 'string' },
          },
        },
      }),
    ).rejects.toThrow(/canonical schema for category email_phishing/i);
    expect(repository.getById).toHaveBeenCalledWith(emailTemplate.tenantId, emailTemplate.id);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects prompt template updates when a category-only patch would invalidate the stored schema', async () => {
    const repository = createRepository();
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-update-category-mismatch',
    });

    await expect(
      service.updatePromptTemplate(emailTemplate.tenantId, emailTemplate.id, {
        category: 'intel_brief',
      }),
    ).rejects.toThrow(/canonical schema for category intel_brief/i);
    expect(repository.getById).toHaveBeenCalledWith(emailTemplate.tenantId, emailTemplate.id);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('maps duplicate prompt template update failures to a conflict app error', async () => {
    const repository = createRepository();
    vi.mocked(repository.update).mockRejectedValue({
      code: '23505',
      constraint: 'ai_prompt_templates_name_version_idx',
    });
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-update-conflict',
    });

    await expect(
      service.updatePromptTemplate(emailTemplate.tenantId, emailTemplate.id, {
        name: 'Conflicting Template',
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
      message: 'A prompt template with this name and version already exists',
      details: expect.objectContaining({
        resource: 'prompt_template',
        conflictFields: ['name', 'version'],
        promptTemplateId: emailTemplate.id,
        name: 'Conflicting Template',
      }),
    });
  });

  it('maps duplicate prompt template version-only updates to a conflict app error without undefined metadata', async () => {
    const repository = createRepository();
    vi.mocked(repository.update).mockRejectedValue({
      code: '23505',
      constraint_name: 'ai_prompt_templates_name_version_idx',
    });
    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway: createContentGateway(),
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-update-version-conflict',
    });

    await expect(
      service.updatePromptTemplate(emailTemplate.tenantId, emailTemplate.id, {
        version: '1.0.1',
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
      message: 'A prompt template with this name and version already exists',
      details: expect.objectContaining({
        resource: 'prompt_template',
        conflictFields: ['name', 'version'],
        promptTemplateId: emailTemplate.id,
        version: '1.0.1',
      }),
    });
  });

  it('generates, classifies, scores, stores email content, and emits analytics + pool events', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    vi.mocked(contentGateway.listFallbackEmailTemplates).mockResolvedValue([
      { id: 'existing-email', name: 'existing', subject: 's', body: 'b', metadata: {} },
    ]);
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          text: JSON.stringify(generatedEmail),
          model: 'claude-sonnet-4-6',
          inputTokens: 123,
          outputTokens: 456,
          latencyMs: 35,
          estimatedCostUsd: 0.007209,
        })
        .mockResolvedValueOnce({
          text: '{"difficulty":4,"rationale":"Subtle indicators and a targeted pretext."}',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 10,
          outputTokens: 20,
          latencyMs: 10,
          estimatedCostUsd: 0.00011,
        }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-123',
      emailPoolLowThreshold: 5,
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      contentName: 'Generated phishing email',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 2,
      context: { faction: 'Nexion Industries', attackType: 'spear_phishing' },
    });

    expect(result.fallbackApplied).toBe(false);
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.storedContent.id).toBe('email-template-1');
    expect(result.difficulty.difficulty).toBe(4);
    expect(result.difficulty.source).toBe('model');
    expect(result.quality.score).toBeGreaterThan(0);
    expect(result.usage).toMatchObject({
      inputTokens: 133,
      outputTokens: 476,
      latencyMs: 45,
      estimatedCostUsd: 0.007319,
    });
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        isAiGenerated: true,
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        metadata: expect.objectContaining({
          usage: expect.objectContaining({
            inputTokens: 133,
            outputTokens: 476,
            latencyMs: 45,
            estimatedCostUsd: 0.007319,
          }),
        }),
      }),
    );
    expect(repository.recordGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        requestId: 'req-123',
        generationParams: expect.objectContaining({
          estimatedCostUsd: 0.007319,
        }),
      }),
    );
    const analyticsEvent = vi
      .mocked(eventBus.publish)
      .mock.calls.map(([event]) => event)
      .find((event) => event.eventType === 'analytics.ai.generation.recorded');
    expect(analyticsEvent).toMatchObject({
      payload: expect.objectContaining({
        inputTokens: 133,
        outputTokens: 476,
        latencyMs: 45,
        estimatedCostUsd: 0.007319,
      }),
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ai.generation.completed',
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'analytics.ai.generation.recorded',
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'content.pool.low',
      }),
    );
  });

  it('rejects unsafe caller-supplied content names before generation starts', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const claudeClient: ClaudeClient = {
      complete: vi.fn(),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-unsafe-content-name',
    });

    await expect(
      service.generateEmail(emailTemplate.tenantId, 'user-1', {
        category: 'email_phishing',
        contentName: 'Google Workspace escalation',
        faction: 'Nexion Industries',
        attackType: 'spear_phishing',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
      details: expect.objectContaining({
        fields: expect.arrayContaining(['contentName', 'faction']),
        flags: expect.arrayContaining(['REAL_BRAND_DETECTED']),
      }),
    });
    expect(repository.getActiveForGeneration).not.toHaveBeenCalled();
    expect(claudeClient.complete).not.toHaveBeenCalled();
    expect(contentGateway.createEmailTemplate).not.toHaveBeenCalled();
  });

  it('rejects unsafe factions resolved from request context before storage fallback can use them', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const claudeClient: ClaudeClient = {
      complete: vi.fn(),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-unsafe-context-faction',
    });

    await expect(
      service.generateEmail(emailTemplate.tenantId, 'user-1', {
        category: 'email_phishing',
        attackType: 'spear_phishing',
        context: {
          faction: 'Google Cloud',
        },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
      details: expect.objectContaining({
        fields: expect.arrayContaining(['faction']),
        flags: expect.arrayContaining(['REAL_BRAND_DETECTED']),
      }),
    });
    expect(repository.getActiveForGeneration).not.toHaveBeenCalled();
    expect(claudeClient.complete).not.toHaveBeenCalled();
    expect(contentGateway.createEmailTemplate).not.toHaveBeenCalled();
  });

  it('uses the category default schema when a legacy prompt template has an empty output schema', async () => {
    const repository = createRepository();
    vi.mocked(repository.getActiveForGeneration).mockResolvedValue({
      ...emailTemplate,
      outputSchema: {},
    });
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const complete = vi
      .fn()
      .mockResolvedValueOnce({
        text: JSON.stringify(generatedEmail),
        model: 'claude-sonnet-4-6',
        inputTokens: 50,
        outputTokens: 100,
        latencyMs: 14,
      })
      .mockResolvedValueOnce({
        text: '{"difficulty":4,"rationale":"Subtle indicators and a targeted pretext."}',
        model: 'claude-haiku-4-5-20251001',
        latencyMs: 5,
      });
    const claudeClient: ClaudeClient = {
      complete,
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-legacy-schema',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
    });

    expect(result.fallbackApplied).toBe(false);
    expect(complete).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userPrompt: expect.stringContaining('"headers"'),
      }),
    );
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        isAiGenerated: true,
      }),
    );
  });

  it('uses template and generated metadata when template-driven email requests omit optional selectors', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const generatedEmailWithMetadata = {
      ...generatedEmail,
      faction: 'Nexion Industries',
      attack_type: 'spear_phishing',
      threat_level: 'HIGH',
    };
    const complete = vi
      .fn()
      .mockResolvedValueOnce({
        text: JSON.stringify(generatedEmailWithMetadata),
        model: 'claude-sonnet-4-6',
        inputTokens: 40,
        outputTokens: 80,
        latencyMs: 12,
      })
      .mockResolvedValueOnce({
        text: '{"difficulty":4,"rationale":"Template context keeps the content targeted."}',
        model: 'claude-haiku-4-5-20251001',
        latencyMs: 6,
      });
    const claudeClient: ClaudeClient = {
      complete,
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-template-context',
    });

    await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      templateId: emailTemplate.id,
    });

    expect(complete).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userPrompt: expect.stringContaining('spear_phishing'),
      }),
    );
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        faction: 'Nexion Industries',
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        season: 1,
        chapter: 2,
      }),
    );
  });

  it('normalizes RFC-style sender headers before storing generated emails', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          text: JSON.stringify({
            ...generatedEmail,
            headers: {
              ...generatedEmail.headers,
              from: 'Relay Office <liaison@nexion.invalid>',
              reply_to: 'Records Desk <records@nexion.invalid>',
            },
          }),
          model: 'claude-sonnet-4-6',
          inputTokens: 75,
          outputTokens: 140,
          latencyMs: 15,
        })
        .mockResolvedValueOnce({
          text: '{"difficulty":4,"rationale":"Targeted impersonation with subtle indicators."}',
          model: 'claude-haiku-4-5-20251001',
          latencyMs: 7,
        }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-rfc-from',
    });

    await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
    });

    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        fromName: 'Relay Office',
        fromEmail: 'liaison@nexion.invalid',
        replyTo: 'records@nexion.invalid',
      }),
    );
  });

  it('retries safety-rejected content with a stricter prompt and succeeds on the next attempt', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const unsafeGeneratedEmail = {
      ...generatedEmail,
      body: {
        ...generatedEmail.body,
        justification: 'Please coordinate with Microsoft support before shift end.',
      },
    };
    const claudeClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          text: JSON.stringify(unsafeGeneratedEmail),
          model: 'claude-sonnet-4-6',
          inputTokens: 90,
          outputTokens: 150,
          latencyMs: 20,
        })
        .mockResolvedValueOnce({
          text: JSON.stringify(generatedEmail),
          model: 'claude-sonnet-4-6',
          inputTokens: 91,
          outputTokens: 140,
          latencyMs: 18,
          estimatedCostUsd: 0.004153,
        })
        .mockResolvedValueOnce({
          text: '{"difficulty":4,"rationale":"Retry output kept the targeted pretext while restoring safety."}',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 8,
          outputTokens: 16,
          latencyMs: 9,
          estimatedCostUsd: 0.000088,
        }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-safety-retry',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
    });

    expect(result.fallbackApplied).toBe(false);
    expect(result.failureCategory).toBeUndefined();
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.usage.inputTokens).toBe(189);
    expect(result.usage.outputTokens).toBe(306);
    expect(result.usage.latencyMs).toBe(47);
    expect(result.usage.estimatedCostUsd).toBe(0.004241);
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        isAiGenerated: true,
      }),
    );
    expect(repository.recordGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'REJECTED',
        requestId: 'req-safety-retry',
        generationParams: expect.objectContaining({
          attempt: 1,
          maxAttempts: 4,
          failureCategory: 'safety_rejection',
          retryScheduled: true,
        }),
      }),
    );
    expect(repository.recordGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        requestId: 'req-safety-retry',
      }),
    );
    expect(claudeClient.complete).toHaveBeenCalledTimes(3);
    expect(vi.mocked(claudeClient.complete).mock.calls[0]?.[0]).toMatchObject({
      temperature: 0.2,
    });
    expect(vi.mocked(claudeClient.complete).mock.calls[1]?.[0]).toMatchObject({
      temperature: 0.1,
      userPrompt: expect.stringContaining('Previous validation category: safety_rejection.'),
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ai.generation.completed',
      }),
    );
  });

  it('falls back immediately when the stored prompt template schema does not match the category contract', async () => {
    const repository = createRepository();
    vi.mocked(repository.getActiveForGeneration).mockResolvedValue({
      ...emailTemplate,
      outputSchema: {
        type: 'object',
        required: ['foo'],
        additionalProperties: false,
        properties: {
          foo: { type: 'string' },
        },
      },
    });
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn(),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-invalid-schema',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Librarians',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.failureCategory).toBe('invalid_output');
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        isAiGenerated: false,
      }),
    );
    expect(claudeClient.complete).not.toHaveBeenCalled();
    const generationLogs = vi
      .mocked(repository.recordGenerationLog)
      .mock.calls.map(([entry]) => entry);
    expect(generationLogs).toHaveLength(1);
    expect(generationLogs[0]).toMatchObject({
      status: 'FAILED',
      requestId: 'req-invalid-schema',
      model: 'handcrafted-fallback',
      errorMessage: 'invalid_output',
      generationParams: expect.objectContaining({
        templateId: emailTemplate.id,
        templateVersion: emailTemplate.version,
        fallbackApplied: true,
        failureCategory: 'invalid_output',
      }),
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ai.generation.failed',
        payload: expect.objectContaining({
          templateId: emailTemplate.id,
          templateVersion: emailTemplate.version,
          errorCategory: 'invalid_output',
        }),
      }),
    );
  });

  it('falls back to handcrafted content when no active prompt template matches the request', async () => {
    const repository = createRepository();
    vi.mocked(repository.getActiveForGeneration).mockResolvedValue(undefined);
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn(),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-missing-template',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.failureCategory).toBe('template_unavailable');
    expect(result.model).toBe('handcrafted-fallback');
    expect(result.templateId).toBe('handcrafted-fallback');
    expect(result.templateVersion).toBe('0.0.0');
    expect(result.promptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(claudeClient.complete).not.toHaveBeenCalled();
    expect(repository.recordGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-missing-template',
        status: 'FAILED',
        model: 'handcrafted-fallback',
        generationParams: expect.objectContaining({
          templateId: 'handcrafted-fallback',
          templateVersion: '0.0.0',
          failureCategory: 'template_unavailable',
        }),
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ai.generation.failed',
        payload: expect.objectContaining({
          templateId: 'handcrafted-fallback',
          templateVersion: '0.0.0',
          model: 'handcrafted-fallback',
          errorCategory: 'template_unavailable',
        }),
      }),
    );
  });

  it('preserves the attempted Claude model in fallback telemetry when the provider fails', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-provider-failure',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        metadata: expect.objectContaining({
          model: 'claude-sonnet-4-6',
        }),
      }),
    );
    expect(repository.recordGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-provider-failure',
        status: 'FAILED',
        model: 'claude-sonnet-4-6',
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ai.generation.failed',
        payload: expect.objectContaining({
          model: 'claude-sonnet-4-6',
        }),
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'analytics.ai.generation.recorded',
        payload: expect.objectContaining({
          model: 'claude-sonnet-4-6',
        }),
      }),
    );
  });

  it('falls back to the built-in handcrafted email when curated fallback lookup fails', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    vi.mocked(contentGateway.listFallbackEmailTemplates).mockRejectedValue(new Error('db down'));
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-fallback-lookup-error',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.failureCategory).toBe('provider_error');
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.content).toMatchObject({
      headers: {
        subject: 'Immediate Credential Refresh Required',
        from: 'liaison@nexion.invalid',
      },
      faction: 'Nexion Industries',
      attack_type: 'spear_phishing',
      threat_level: 'HIGH',
    });
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        subject: 'Immediate Credential Refresh Required',
        fromEmail: 'liaison@nexion.invalid',
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        difficulty: result.difficulty.difficulty,
        isAiGenerated: false,
      }),
    );
  });

  it('uses the requested faction branding in phishing fallbacks', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-sovereign-fallback',
    });

    await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Sovereign Compact',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
    });

    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        fromEmail: 'liaison@compact.invalid',
        replyTo: 'liaison@compact.invalid',
        body: expect.stringContaining('Sovereign Compact Relay'),
      }),
    );
  });

  it('reuses handcrafted content-module templates when generation fails', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    vi.mocked(contentGateway.listFallbackEmailTemplates).mockResolvedValue([
      {
        id: 'handcrafted-email-1',
        name: 'Curated Relay Follow-up',
        subject: 'Archive Relay Follow-up Review',
        body: [
          'Gatekeeper,',
          '',
          'Please review the relay follow-up request attached to this intake packet.',
          '',
          'The request matches the relay ticket already logged with records desk.',
          '',
          'Verify the packet details before approving access.',
          '',
          'Records Desk, Librarians',
        ].join('\n'),
        fromName: 'Records Desk',
        fromEmail: 'records-desk@librarians.test',
        replyTo: 'records-desk@librarians.test',
        contentType: 'legitimate',
        difficulty: 2,
        faction: 'Librarians',
        threatLevel: 'LOW',
        isAiGenerated: false,
        metadata: {
          signals: [
            {
              type: 'verification_hint',
              description: 'The request references an offline packet the player can cross-check.',
            },
          ],
        },
      },
    ]);
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-handcrafted-fallback',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_legitimate',
      faction: 'Librarians',
      threatLevel: 'LOW',
      difficulty: 2,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.difficulty).toMatchObject({
      difficulty: 2,
      source: 'heuristic',
    });
    expect(result.content).toMatchObject({
      headers: {
        subject: 'Archive Relay Follow-up Review',
        from: 'records-desk@librarians.test',
      },
      body: {
        summary: 'Please review the relay follow-up request attached to this intake packet.',
      },
    });
    expect(result.content).not.toHaveProperty('attack_type');
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        subject: 'Archive Relay Follow-up Review',
        fromEmail: 'records-desk@librarians.test',
        attackType: null,
        difficulty: 2,
        body: expect.stringContaining('Verify the packet details before approving access.'),
        isAiGenerated: false,
      }),
    );
  });

  it('rejects AI-derived fallback rows and uses the handcrafted legitimate template instead', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    vi.mocked(contentGateway.listFallbackEmailTemplates).mockResolvedValue([
      {
        id: 'stored-ai-legitimate-email',
        name: 'Stored AI Legitimate Template',
        subject: 'Stored AI Legitimate Subject',
        body: 'Stored AI legitimate fallback body',
        fromName: 'Records Desk',
        fromEmail: 'records-desk@librarians.test',
        replyTo: 'records-desk@librarians.test',
        contentType: 'legitimate',
        difficulty: 2,
        faction: 'Librarians',
        threatLevel: 'LOW',
        isAiGenerated: true,
        metadata: {},
      },
      {
        id: 'curated-legitimate-generated-email',
        name: 'Curated Legitimate Relay Follow-up',
        subject: 'Curated AI-Derived Relay Follow-up',
        body: 'Template body fallback',
        fromName: 'Records Desk',
        fromEmail: 'records-desk@librarians.test',
        replyTo: 'records-desk@librarians.test',
        contentType: 'legitimate',
        difficulty: 2,
        faction: 'Librarians',
        threatLevel: 'LOW',
        isAiGenerated: false,
        metadata: {
          generatedContent: {
            content_type: 'email',
            headers: {
              from: 'records-desk@librarians.test',
              to: 'intake@archive.invalid',
              subject: 'Curated AI-Derived Relay Follow-up',
              date: '2063-09-14T14:22:00Z',
              message_id: '<curated-legitimate@archive.test>',
              reply_to: 'records-desk@librarians.test',
              spf: 'pass',
              dkim: 'pass',
              dmarc: 'pass',
            },
            body: {
              greeting: 'Gatekeeper,',
              summary: 'Please review the relay follow-up request attached to this intake packet.',
              justification:
                'The request matches the relay ticket already logged with records desk.',
              call_to_action: 'Verify the packet details before approving access.',
              signature: 'Records Desk, Librarians',
            },
            links: [
              {
                label: 'Verification Ledger',
                url: 'https://verification.archive.test/ledger',
                is_suspicious: false,
              },
            ],
            attachments: [{ name: 'verification_packet.pdf', type: 'pdf', is_suspicious: false }],
            signals: [
              {
                type: 'verification_hint',
                location: 'body.call_to_action',
                explanation: 'The request includes a clear offline verification step.',
              },
            ],
            safety_flags: ['ok'],
            faction: 'Librarians',
            threat_level: 'LOW',
            difficulty: 2,
          },
        },
      },
      {
        id: 'handcrafted-legitimate-email',
        name: 'Handcrafted Legitimate Relay Follow-up',
        subject: 'Handcrafted Relay Packet Review',
        body: [
          'Gatekeeper,',
          '',
          'Please review the handwritten relay packet before the next shift begins.',
          '',
          'The packet matches the maintenance ledger already logged by records desk.',
          '',
          'Verify the relay packet against the paper ledger before approval.',
          '',
          'Records Desk, Librarians',
        ].join('\n'),
        fromName: 'Records Desk',
        fromEmail: 'records-desk@librarians.test',
        replyTo: 'records-desk@librarians.test',
        contentType: 'legitimate',
        difficulty: 2,
        faction: 'Librarians',
        threatLevel: 'LOW',
        isAiGenerated: false,
        metadata: {},
      },
    ]);
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-curated-legitimate-generated-fallback',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_legitimate',
      faction: 'Librarians',
      threatLevel: 'LOW',
      difficulty: 2,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.content).toMatchObject({
      headers: {
        subject: 'Handcrafted Relay Packet Review',
        from: 'records-desk@librarians.test',
      },
      body: {
        summary: 'Please review the handwritten relay packet before the next shift begins.',
      },
      faction: 'Librarians',
      threat_level: 'LOW',
      difficulty: 2,
    });
    expect(result.content).not.toHaveProperty('attack_type');
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        subject: 'Handcrafted Relay Packet Review',
        fromEmail: 'records-desk@librarians.test',
        attackType: null,
        threatLevel: 'LOW',
        difficulty: 2,
        body: expect.stringContaining(
          'Verify the relay packet against the paper ledger before approval.',
        ),
        isAiGenerated: false,
      }),
    );
  });

  it('keeps legitimate handcrafted fallbacks out of phishing metadata and difficulty scoring', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-legitimate-handcrafted',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_legitimate',
      faction: 'Librarians',
      threatLevel: 'LOW',
      difficulty: 2,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.difficulty).toMatchObject({
      difficulty: 2,
      source: 'heuristic',
    });
    expect(result.content).not.toHaveProperty('attack_type');
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        attackType: null,
        difficulty: 2,
        contentType: 'email_legitimate',
      }),
    );
  });

  it('ignores curated fallback templates whose selectors conflict with the requested exercise', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    vi.mocked(contentGateway.listFallbackEmailTemplates).mockResolvedValue([
      {
        id: 'conflicting-fallback-email',
        name: 'Credential reset escalation',
        subject: 'Credential Reset Escalation',
        body: [
          'Director,',
          '',
          'Your archive credential needs to be reset before the current token expires.',
          '',
          'Use the credential repair portal to complete the recovery before the next intake cycle.',
          '',
          'Security Desk, Nexion Industries',
        ].join('\n'),
        fromName: 'Security Desk',
        fromEmail: 'security@nexion.invalid',
        replyTo: 'security@nexion.invalid',
        contentType: 'email_phishing',
        difficulty: 4,
        faction: 'Nexion Industries',
        attackType: 'credential_harvesting',
        threatLevel: 'HIGH',
        season: 1,
        chapter: 2,
        isAiGenerated: false,
        metadata: {},
      },
    ]);
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-filtered-fallback',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'supply_chain',
      threatLevel: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 2,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(contentGateway.listFallbackEmailTemplates).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        attackType: 'supply_chain',
        season: 1,
        chapter: 2,
      }),
    );
    expect(result.content).toMatchObject({
      headers: {
        subject: 'Immediate Credential Refresh Required',
      },
      faction: 'Nexion Industries',
      attack_type: 'supply_chain',
      threat_level: 'HIGH',
      season: 1,
      chapter: 2,
    });
    expect(contentGateway.createEmailTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        subject: 'Immediate Credential Refresh Required',
        attackType: 'supply_chain',
        threatLevel: 'HIGH',
        season: 1,
        chapter: 2,
      }),
    );
  });

  it('uses a default call to action when a curated fallback only has summary and justification paragraphs', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    vi.mocked(contentGateway.listFallbackEmailTemplates).mockResolvedValue([
      {
        id: 'short-handcrafted-email',
        name: 'Short relay follow-up',
        subject: 'Archive Relay Follow-up Review',
        body: [
          'Gatekeeper,',
          '',
          'Please review the relay follow-up request attached to this intake packet.',
          '',
          'The request matches the relay ticket already logged with records desk.',
          '',
          'Records Desk, Librarians',
        ].join('\n'),
        fromName: 'Records Desk',
        fromEmail: 'records-desk@librarians.test',
        replyTo: 'records-desk@librarians.test',
        contentType: 'legitimate',
        difficulty: 2,
        faction: 'Librarians',
        threatLevel: 'LOW',
        isAiGenerated: false,
        metadata: {},
      },
    ]);
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider offline')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-short-fallback',
    });

    const result = await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_legitimate',
      faction: 'Librarians',
      threatLevel: 'LOW',
      difficulty: 2,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.content).toMatchObject({
      body: {
        summary: 'Please review the relay follow-up request attached to this intake packet.',
        justification: 'The request matches the relay ticket already logged with records desk.',
        call_to_action: 'Use your standard verification process before approving this request.',
      },
    });
    expect(result.content['body']).not.toBeUndefined();
    expect((result.content['body'] as Record<string, unknown>)['justification']).not.toBe(
      (result.content['body'] as Record<string, unknown>)['call_to_action'],
    );
  });

  it('uses the post-store generated pool size when deciding whether to emit content.pool.low', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const poolEntries: Array<Record<string, unknown>> = [
      {
        id: 'existing-generated-email',
        name: 'existing',
        subject: 's',
        body: 'b',
        contentType: 'email_phishing',
        difficulty: 4,
        isAiGenerated: true,
        metadata: {
          generatedContent: {
            content_type: 'email',
          },
        },
      },
    ];
    vi.mocked(contentGateway.createEmailTemplate).mockImplementation(async () => {
      poolEntries.push({
        id: 'new-generated-email',
        name: 'new',
        subject: 's2',
        body: 'b2',
        contentType: 'email_phishing',
        difficulty: 4,
        isAiGenerated: true,
        metadata: {
          generatedContent: {
            content_type: 'email',
          },
        },
      });
      return { id: 'new-generated-email' };
    });
    vi.mocked(contentGateway.listEmailTemplates).mockImplementation(
      async () => poolEntries as Awaited<ReturnType<ContentGateway['listEmailTemplates']>>,
    );
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          text: JSON.stringify(generatedEmail),
          model: 'claude-sonnet-4-6',
          inputTokens: 123,
          outputTokens: 456,
          latencyMs: 35,
          estimatedCostUsd: 0.007209,
        })
        .mockResolvedValueOnce({
          text: '{"difficulty":4,"rationale":"Subtle indicators and a targeted pretext."}',
          model: 'claude-haiku-4-5-20251001',
          latencyMs: 10,
        }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-low-pool',
      emailPoolLowThreshold: 2,
    });

    await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 2,
      context: { faction: 'Nexion Industries', attackType: 'spear_phishing' },
    });

    expect(contentGateway.listEmailTemplates).toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'content.pool.low',
      }),
    );
  });

  it('calculates low-pool events from the per-difficulty pool, not request-specific selectors', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    vi.mocked(contentGateway.listEmailTemplates).mockImplementation(async (_tenantId, filters) => {
      if (filters.contentType !== 'email_phishing') {
        return [];
      }

      return [
        {
          id: 'tier-4-email-1',
          name: 'Tier 4 1',
          subject: 'Subject 1',
          body: 'Body 1',
          isAiGenerated: true,
          metadata: {},
        },
        {
          id: 'tier-4-email-2',
          name: 'Tier 4 2',
          subject: 'Subject 2',
          body: 'Body 2',
          isAiGenerated: true,
          metadata: {},
        },
        {
          id: 'tier-4-email-3',
          name: 'Tier 4 3',
          subject: 'Subject 3',
          body: 'Body 3',
          isAiGenerated: true,
          metadata: {},
        },
      ];
    });
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          text: JSON.stringify(generatedEmail),
          model: 'claude-sonnet-4-6',
          inputTokens: 123,
          outputTokens: 456,
          latencyMs: 35,
          estimatedCostUsd: 0.007209,
        })
        .mockResolvedValueOnce({
          text: '{"difficulty":4,"rationale":"Subtle indicators and a targeted pretext."}',
          model: 'claude-haiku-4-5-20251001',
          latencyMs: 10,
        }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-healthy-tier-pool',
      emailPoolLowThreshold: 2,
    });

    await service.generateEmail(emailTemplate.tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 2,
      context: { faction: 'Nexion Industries', attackType: 'spear_phishing' },
    });

    expect(contentGateway.listEmailTemplates).toHaveBeenNthCalledWith(1, emailTemplate.tenantId, {
      contentType: 'email_phishing',
      difficulty: 4,
      isActive: true,
    });
    expect(contentGateway.listEmailTemplates).toHaveBeenNthCalledWith(2, emailTemplate.tenantId, {
      contentType: 'phishing',
      difficulty: 4,
      isActive: true,
    });
    expect(eventBus.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'content.pool.low',
      }),
    );
  });

  it('stores generated intelligence briefs in the content document surface', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue({
        text: JSON.stringify(generatedIntelBrief),
        model: 'claude-sonnet-4-6',
        inputTokens: 60,
        outputTokens: 120,
        latencyMs: 25,
      }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-intel',
    });

    const result = await service.generateIntelBrief(emailTemplate.tenantId, 'user-1', {
      threatLevel: 'HIGH',
      season: 1,
    });

    expect(result.storedContent).toEqual({
      kind: 'document',
      id: 'document-template-1',
    });
    expect(contentGateway.createDocumentTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        documentType: 'INTELLIGENCE_BRIEF',
      }),
    );
  });

  it('preserves requested difficulty for intelligence briefs when classification falls back to heuristics', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          text: JSON.stringify(generatedIntelBrief),
          model: 'claude-sonnet-4-6',
          inputTokens: 60,
          outputTokens: 120,
          latencyMs: 25,
        })
        .mockResolvedValueOnce({
          text: '{"difficulty":"hard"}',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 8,
          outputTokens: 10,
          latencyMs: 6,
        }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-intel-baseline',
    });

    const result = await service.generateIntelBrief(emailTemplate.tenantId, 'user-1', {
      threatLevel: 'HIGH',
      season: 1,
      difficulty: 5,
    });

    expect(result.fallbackApplied).toBe(false);
    expect(result.difficulty).toMatchObject({
      difficulty: 5,
      source: 'heuristic',
      rationale: 'Non-email content uses the requested/template baseline difficulty for v1.',
    });
    expect(contentGateway.createDocumentTemplate).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        difficulty: 5,
        metadata: expect.objectContaining({
          difficulty: expect.objectContaining({
            difficulty: 5,
            source: 'heuristic',
          }),
        }),
      }),
    );
  });

  it('stores generated scenario variations in the scenario surface', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue({
        text: JSON.stringify(generatedScenarioVariation),
        model: 'claude-sonnet-4-6',
        inputTokens: 70,
        outputTokens: 140,
        latencyMs: 30,
      }),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-scenario',
    });

    const result = await service.generateScenarioVariation(emailTemplate.tenantId, 'user-1', {
      attackType: 'supply_chain',
      threatLevel: 'ELEVATED',
      season: 2,
    });

    expect(result.storedContent).toEqual({
      kind: 'scenario',
      id: 'scenario-1',
    });
    expect(contentGateway.createScenario).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        name: 'Relay trust erosion',
      }),
    );
  });

  it('preserves requested difficulty for scenario variations when generation falls back to handcrafted content', async () => {
    const repository = createRepository();
    const contentGateway = createContentGateway();
    const eventBus = createEventBus();
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockRejectedValue(new Error('provider unavailable')),
    };

    const service = createAiPipelineService({
      config: createTestConfig(),
      eventBus,
      logger,
      promptTemplateRepository: repository,
      contentGateway,
      claudeClient,
      generateId: () => 'req-scenario-baseline',
    });

    const result = await service.generateScenarioVariation(emailTemplate.tenantId, 'user-1', {
      attackType: 'supply_chain',
      threatLevel: 'ELEVATED',
      season: 2,
      difficulty: 1,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.difficulty).toMatchObject({
      difficulty: 1,
      source: 'heuristic',
      rationale: 'Non-email content uses the requested/template baseline difficulty for v1.',
    });
    expect(contentGateway.createScenario).toHaveBeenCalledWith(
      emailTemplate.tenantId,
      expect.objectContaining({
        difficulty: 1,
        metadata: expect.objectContaining({
          difficulty: expect.objectContaining({
            difficulty: 1,
            source: 'heuristic',
          }),
        }),
      }),
    );
  });
});
