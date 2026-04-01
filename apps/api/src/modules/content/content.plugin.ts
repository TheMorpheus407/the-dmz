import fp from 'fastify-plugin';

import { registerContentRoutes } from './content.routes.js';
import {
  createEmailTemplateRecord,
  listEmailTemplates,
  listFallbackEmailTemplates,
} from './email-templates/index.js';
import { createDocumentTemplateRecord } from './documents/index.js';
import { createScenarioRecord } from './scenarios/index.js';

import type { FastifyPluginAsync } from 'fastify';

type ContentGatewayService = {
  createEmailTemplate: (
    tenantId: Parameters<typeof createEmailTemplateRecord>[1],
    input: Parameters<typeof createEmailTemplateRecord>[2],
  ) => Promise<{ id: string }>;
  listEmailTemplates: (
    tenantId: Parameters<typeof listEmailTemplates>[1],
    filters?: Parameters<typeof listEmailTemplates>[2],
  ) => Promise<
    Array<{
      id: string;
      name: string;
      subject: string;
      body: string;
      fromName?: string | null;
      fromEmail?: string | null;
      replyTo?: string | null;
      metadata?: Record<string, unknown>;
    }>
  >;
  listFallbackEmailTemplates: (
    tenantId: Parameters<typeof listFallbackEmailTemplates>[1],
    filters?: Parameters<typeof listFallbackEmailTemplates>[2],
  ) => Promise<
    Array<{
      id: string;
      name: string;
      subject: string;
      body: string;
      fromName?: string | null;
      fromEmail?: string | null;
      replyTo?: string | null;
      metadata?: Record<string, unknown>;
    }>
  >;
  createDocumentTemplate: (
    tenantId: Parameters<typeof createDocumentTemplateRecord>[1],
    input: Parameters<typeof createDocumentTemplateRecord>[2],
  ) => Promise<{ id: string }>;
  createScenario: (
    tenantId: Parameters<typeof createScenarioRecord>[1],
    input: Parameters<typeof createScenarioRecord>[2],
  ) => Promise<{ id: string }>;
};

declare module 'fastify' {
  interface FastifyInstance {
    content: {
      service: ContentGatewayService;
    };
  }
}

const mapEmailTemplateGatewayRecord = (
  template: Awaited<ReturnType<typeof listEmailTemplates>>[number],
) => ({
  id: template.id,
  name: template.name,
  subject: template.subject,
  body: template.body,
  fromName: template.fromName,
  fromEmail: template.fromEmail,
  replyTo: template.replyTo,
  contentType: template.contentType,
  difficulty: template.difficulty,
  faction: template.faction,
  attackType: template.attackType,
  threatLevel: template.threatLevel,
  season: template.season,
  chapter: template.chapter,
  isAiGenerated: template.isAiGenerated,
  metadata:
    template.metadata && typeof template.metadata === 'object' && !Array.isArray(template.metadata)
      ? (template.metadata as Record<string, unknown>)
      : {},
});

const contentPluginImpl: FastifyPluginAsync = async (fastify) => {
  if (!fastify.eventBus) {
    throw new Error('eventBus plugin is required for content module');
  }

  fastify.decorate('content', {
    service: {
      createEmailTemplate: (tenantId, input) =>
        createEmailTemplateRecord(fastify.config, tenantId, input),
      listEmailTemplates: async (tenantId, filters) => {
        const templates = await listEmailTemplates(fastify.config, tenantId, filters);
        return templates.map(mapEmailTemplateGatewayRecord);
      },
      listFallbackEmailTemplates: async (tenantId, filters) => {
        const templates = await listFallbackEmailTemplates(fastify.config, tenantId, filters);
        return templates.map(mapEmailTemplateGatewayRecord);
      },
      createDocumentTemplate: (tenantId, input) =>
        createDocumentTemplateRecord(fastify.config, tenantId, input),
      createScenario: (tenantId, input) => createScenarioRecord(fastify.config, tenantId, input),
    },
  });

  await registerContentRoutes(fastify);
};

export const contentPlugin = fp(contentPluginImpl, {
  name: 'content',
  dependencies: ['eventBus'],
});
