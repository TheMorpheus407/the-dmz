import fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/middleware/authorization.js', async () => {
  const actual = await vi.importActual('../../../shared/middleware/authorization.js');

  return {
    ...actual,
    authGuard: async () => undefined,
    requirePermission: () => async () => undefined,
  };
});

vi.mock('../../../shared/middleware/tenant-context.js', () => ({
  tenantContext: async () => undefined,
}));

vi.mock('../../../shared/middleware/tenant-status-guard.js', () => ({
  tenantStatusGuard: async () => undefined,
}));

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { conflict, createErrorHandler } from '../../../shared/middleware/error-handler.js';
import { registerAiPipelineRoutes } from '../ai-pipeline.routes.js';

import type { PromptTemplate } from '../../../db/schema/ai/prompt-templates.js';
import type { AiPipelineService } from '../ai-pipeline.types.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  };
};

const promptTemplate = {
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
  userTemplate: 'Generate a phishing email.',
  outputSchema: { type: 'object' },
  version: '1.0.0',
  tokenBudget: 1200,
  isActive: true,
  metadata: {},
  createdAt: new Date('2026-03-01T00:00:00Z'),
  updatedAt: new Date('2026-03-01T00:00:00Z'),
} satisfies PromptTemplate;

const generationResult = {
  requestId: 'req-123',
  templateId: promptTemplate.id,
  templateVersion: '1.0.0',
  model: 'claude-sonnet-4-6',
  fallbackApplied: false,
  promptHash: 'hash',
  content: { content_type: 'email' },
  quality: {
    score: 0.86,
    breakdown: {
      plausibility: 0.9,
      signalClarity: 0.8,
      variety: 0.8,
      pedagogicalValue: 0.9,
      narrativeAlignment: 0.9,
    },
  },
  difficulty: {
    difficulty: 4,
    source: 'model' as const,
    rationale: 'Subtle indicators',
  },
  safety: {
    ok: true,
    flags: ['ok'],
    findings: [],
  },
  reviewStatus: {
    requiresReview: false,
    triggers: [],
  },
  storedContent: {
    kind: 'email' as const,
    id: 'email-template-1',
  },
  usage: {
    inputTokens: 120,
    outputTokens: 240,
    latencyMs: 30,
    estimatedCostUsd: 0.00396,
  },
};

describe('ai-pipeline routes', () => {
  const service: AiPipelineService = {
    listPromptTemplates: vi.fn(),
    getPromptTemplate: vi.fn(),
    createPromptTemplate: vi.fn(),
    updatePromptTemplate: vi.fn(),
    deletePromptTemplate: vi.fn(),
    generateContent: vi.fn(),
    generateEmail: vi.fn(),
    generateIntelBrief: vi.fn(),
    generateScenarioVariation: vi.fn(),
  };
  const app = fastify({ logger: false });

  beforeAll(async () => {
    app.setErrorHandler(createErrorHandler());

    app.addHook('preHandler', async (request) => {
      request.user = {
        userId: 'user-1',
        tenantId: '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
        sessionId: 'session-1',
        role: 'admin',
      };
    });

    await app.register(
      async (instance) => {
        await registerAiPipelineRoutes(instance, service);
      },
      { prefix: '/api/v1' },
    );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates prompt templates with contextual metadata', async () => {
    vi.mocked(service.createPromptTemplate).mockResolvedValue(promptTemplate);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      payload: {
        name: 'Email Phishing Template',
        category: 'email_phishing',
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        difficulty: 4,
        season: 1,
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email.',
        outputSchema: { type: 'object', required: ['content_type'] },
        version: '1.0.0',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        id: promptTemplate.id,
        name: 'Email Phishing Template',
      }),
    });
    expect(service.createPromptTemplate).toHaveBeenCalledWith(
      '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
      expect.objectContaining({
        attackType: 'spear_phishing',
        season: 1,
      }),
    );
  });

  it('rejects prompt template versions that are not semantic versions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      payload: {
        name: 'Invalid Version Template',
        category: 'email_phishing',
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email.',
        outputSchema: { type: 'object', required: ['content_type'] },
        version: 'v1',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects prompt templates without an output schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      payload: {
        name: 'Missing Schema Template',
        category: 'email_phishing',
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email.',
        version: '1.0.0',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.createPromptTemplate).not.toHaveBeenCalled();
  });

  it('returns the shared conflict contract when prompt template creation collides on name and version', async () => {
    vi.mocked(service.createPromptTemplate).mockRejectedValue(
      conflict('A prompt template with this name and version already exists', {
        resource: 'prompt_template',
        conflictFields: ['name', 'version'],
        name: promptTemplate.name,
        version: promptTemplate.version,
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      payload: {
        name: promptTemplate.name,
        category: 'email_phishing',
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email.',
        outputSchema: { type: 'object', required: ['content_type'] },
        version: promptTemplate.version,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: 'A prompt template with this name and version already exists',
          details: expect.any(Object),
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('lists prompt templates with contextual filters', async () => {
    vi.mocked(service.listPromptTemplates).mockResolvedValue([promptTemplate]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/prompt-templates?category=email_phishing&attackType=spear_phishing&season=1&difficulty=4&isActive=true',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [expect.objectContaining({ id: promptTemplate.id })],
    });
    expect(service.listPromptTemplates).toHaveBeenCalledWith(
      '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
      expect.objectContaining({
        category: 'email_phishing',
        attackType: 'spear_phishing',
        season: 1,
        difficulty: 4,
        isActive: true,
      }),
    );
  });

  it('returns the shared not-found contract when a prompt template lookup misses', async () => {
    vi.mocked(service.getPromptTemplate).mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/ai/prompt-templates/${promptTemplate.id}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Prompt template not found',
          details: expect.any(Object),
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('deletes prompt templates', async () => {
    vi.mocked(service.deletePromptTemplate).mockResolvedValue(true);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/ai/prompt-templates/${promptTemplate.id}`,
    });

    expect(response.statusCode).toBe(204);
    expect(service.deletePromptTemplate).toHaveBeenCalledWith(
      '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
      promptTemplate.id,
    );
  });

  it('returns the shared not-found contract when prompt template updates miss', async () => {
    vi.mocked(service.updatePromptTemplate).mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/ai/prompt-templates/${promptTemplate.id}`,
      payload: {
        description: 'updated',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Prompt template not found',
          details: expect.any(Object),
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('returns the shared not-found contract when prompt template deletion misses', async () => {
    vi.mocked(service.deletePromptTemplate).mockResolvedValue(false);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/ai/prompt-templates/${promptTemplate.id}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Prompt template not found',
          details: expect.any(Object),
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('allows patch requests to clear nullable contextual selectors', async () => {
    vi.mocked(service.updatePromptTemplate).mockResolvedValue({
      ...promptTemplate,
      attackType: null,
      threatLevel: null,
      difficulty: null,
      season: null,
      chapter: null,
      description: null,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/ai/prompt-templates/${promptTemplate.id}`,
      payload: {
        attackType: null,
        threatLevel: null,
        difficulty: null,
        season: null,
        chapter: null,
        description: null,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(service.updatePromptTemplate).toHaveBeenCalledWith(
      '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
      promptTemplate.id,
      {
        attackType: null,
        threatLevel: null,
        difficulty: null,
        season: null,
        chapter: null,
        description: null,
      },
    );
  });

  it('returns the shared conflict contract when prompt template updates collide on name and version', async () => {
    vi.mocked(service.updatePromptTemplate).mockRejectedValue(
      conflict('A prompt template with this name and version already exists', {
        resource: 'prompt_template',
        conflictFields: ['name', 'version'],
        promptTemplateId: promptTemplate.id,
        name: promptTemplate.name,
      }),
    );

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/ai/prompt-templates/${promptTemplate.id}`,
      payload: {
        name: promptTemplate.name,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: 'A prompt template with this name and version already exists',
          details: expect.any(Object),
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('generates email content', async () => {
    vi.mocked(service.generateEmail).mockResolvedValue(generationResult);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/generate/email',
      payload: {
        category: 'email_phishing',
        faction: 'Nexion Industries',
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: expect.objectContaining({
        requestId: 'req-123',
        model: 'claude-sonnet-4-6',
      }),
    });
    expect(service.generateEmail).toHaveBeenCalledWith(
      '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
      'user-1',
      expect.objectContaining({
        category: 'email_phishing',
        attackType: 'spear_phishing',
      }),
    );
  });

  it('rejects unsupported faction values on generation requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/generate/email',
      payload: {
        category: 'email_phishing',
        faction: 'Google',
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.generateEmail).not.toHaveBeenCalled();
  });

  it('generates intelligence briefs', async () => {
    vi.mocked(service.generateIntelBrief).mockResolvedValue({
      ...generationResult,
      storedContent: {
        kind: 'document',
        id: 'document-template-1',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/generate/intel-brief',
      payload: {
        threatLevel: 'HIGH',
        season: 1,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(service.generateIntelBrief).toHaveBeenCalledWith(
      '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
      'user-1',
      expect.objectContaining({
        season: 1,
      }),
    );
  });

  it('generates scenario variations', async () => {
    vi.mocked(service.generateScenarioVariation).mockResolvedValue({
      ...generationResult,
      storedContent: {
        kind: 'scenario',
        id: 'scenario-1',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/generate/scenario-variation',
      payload: {
        attackType: 'supply_chain',
        threatLevel: 'ELEVATED',
        season: 2,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(service.generateScenarioVariation).toHaveBeenCalledWith(
      '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
      'user-1',
      expect.objectContaining({
        attackType: 'supply_chain',
        season: 2,
      }),
    );
  });

  it('registers runtime routes at /api/v1/ai without a duplicated prefix', async () => {
    const runtimeApp = buildApp(createTestConfig(), { skipHealthCheck: true });

    try {
      await runtimeApp.ready();
      expect(runtimeApp.hasRoute({ method: 'GET', url: '/api/v1/ai/prompt-templates' })).toBe(true);
      expect(runtimeApp.hasRoute({ method: 'POST', url: '/api/v1/ai/generate/email' })).toBe(true);
      expect(runtimeApp.hasRoute({ method: 'GET', url: '/api/v1/ai/ai/prompt-templates' })).toBe(
        false,
      );
    } finally {
      await runtimeApp.close();
    }
  });
});
