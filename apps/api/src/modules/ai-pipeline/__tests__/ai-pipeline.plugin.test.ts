import fastify from 'fastify';
import fp from 'fastify-plugin';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

import { loadConfig, type AppConfig } from '../../../config.js';
import { DefaultEventBus } from '../../../shared/events/index.js';
import { aiPipelinePlugin } from '../ai-pipeline.plugin.js';
import { getDefaultOutputSchema } from '../output-parser.service.js';

import type {
  ClaudeClient,
  ContentGateway,
  PromptTemplateRepository,
} from '../ai-pipeline.types.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ANTHROPIC_API_KEY: 'test-key',
  };
};

const generationTemplate = {
  id: 'c648734f-5d42-4a30-a73a-4770f4d93c5f',
  tenantId: '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
  name: 'Runtime email template',
  category: 'email_phishing',
  description: 'Runtime template',
  attackType: 'spear_phishing',
  threatLevel: 'HIGH',
  difficulty: 4,
  season: 1,
  chapter: 1,
  systemPrompt: 'Generate JSON only.',
  userTemplate: 'Generate a phishing email.',
  outputSchema: getDefaultOutputSchema('email_phishing'),
  version: '1.0.0',
  tokenBudget: 1200,
  isActive: true,
  metadata: {},
  createdAt: new Date('2026-03-01T00:00:00Z'),
  updatedAt: new Date('2026-03-01T00:00:00Z'),
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

describe('ai-pipeline.plugin integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handles end-to-end email generation through the registered plugin', async () => {
    const app = fastify({ logger: false });
    const eventBus = new DefaultEventBus();
    const publishSpy = vi.spyOn(eventBus, 'publish');
    const promptTemplateRepository: PromptTemplateRepository = {
      list: vi.fn().mockResolvedValue([generationTemplate]),
      getById: vi.fn().mockResolvedValue(generationTemplate),
      getActiveForGeneration: vi.fn().mockResolvedValue(generationTemplate),
      create: vi.fn().mockResolvedValue(generationTemplate),
      update: vi.fn().mockResolvedValue(generationTemplate),
      delete: vi.fn().mockResolvedValue(true),
      recordGenerationLog: vi.fn().mockResolvedValue(undefined),
    };
    const contentGateway: ContentGateway = {
      createEmailTemplate: vi.fn().mockResolvedValue({ id: 'email-template-1' }),
      listEmailTemplates: vi.fn().mockResolvedValue([]),
      listFallbackEmailTemplates: vi.fn().mockResolvedValue([]),
      createDocumentTemplate: vi.fn().mockResolvedValue({ id: 'document-template-1' }),
      createScenario: vi.fn().mockResolvedValue({ id: 'scenario-1' }),
    };
    const contentModuleGateway = {
      ...contentGateway,
      listEmailTemplates: (
        tenantId: string,
        filters?: Parameters<ContentGateway['listEmailTemplates']>[1],
      ) => contentGateway.listEmailTemplates(tenantId, filters ?? {}),
      listFallbackEmailTemplates: (
        tenantId: string,
        filters?: Parameters<ContentGateway['listFallbackEmailTemplates']>[1],
      ) => contentGateway.listFallbackEmailTemplates(tenantId, filters ?? {}),
    };
    const claudeClient: ClaudeClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          text: JSON.stringify(generatedEmail),
          model: 'claude-sonnet-4-6',
          inputTokens: 110,
          outputTokens: 220,
          latencyMs: 28,
          estimatedCostUsd: 0.00363,
        })
        .mockResolvedValueOnce({
          text: '{"difficulty":4,"rationale":"Targeted pretext with subtle signals."}',
          model: 'claude-haiku-4-5-20251001',
          latencyMs: 8,
        }),
    };

    app.decorate('config', createTestConfig());
    app.addHook('preHandler', async (request) => {
      request.user = {
        userId: 'user-1',
        tenantId: generationTemplate.tenantId,
        sessionId: 'session-1',
        role: 'admin',
      };
    });

    await app.register(
      fp(
        async (instance) => {
          instance.decorate('eventBus', eventBus);
        },
        { name: 'eventBus' },
      ),
    );
    await app.register(
      fp(
        async (instance) => {
          instance.decorate('content', { service: contentModuleGateway });
        },
        { name: 'content', dependencies: ['eventBus'] },
      ),
    );
    await app.register(
      async (instance) => {
        await instance.register(aiPipelinePlugin, {
          serviceOptions: {
            promptTemplateRepository,
            contentGateway,
            claudeClient,
            generateId: () => 'plugin-req-1',
            emailPoolLowThreshold: 10,
          },
        });
      },
      { prefix: '/api/v1' },
    );

    await app.ready();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/generate/email',
        payload: {
          category: 'email_phishing',
          faction: 'Nexion Industries',
          attackType: 'spear_phishing',
          threatLevel: 'HIGH',
          difficulty: 4,
          season: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        data: expect.objectContaining({
          requestId: 'plugin-req-1',
          fallbackApplied: false,
          storedContent: {
            kind: 'email',
            id: 'email-template-1',
          },
        }),
      });
      expect(contentGateway.createEmailTemplate).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'analytics.ai.generation.recorded',
        }),
      );
    } finally {
      await app.close();
    }
  });
});
