import fp from 'fastify-plugin';

import { registerContentRoutes } from './content.routes.js';
import {
  createEmailTemplateRecord,
  listEmailTemplates,
  listFallbackEmailTemplates,
  type EmailTemplateInput,
} from './email-templates/index.js';
import { createDocumentTemplateRecord, type DocumentTemplateInput } from './documents/index.js';
import { createScenarioRecord, type ScenarioInput } from './scenarios/index.js';

import type { FastifyPluginAsync } from 'fastify';

interface EmailTemplateOutput {
  id: string;
  name: string;
  subject: string;
  body: string;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  metadata?: Record<string, unknown>;
}

interface ContentGatewayService {
  createEmailTemplate(tenantId: string, input: EmailTemplateInput): Promise<{ id: string }>;
  listEmailTemplates(
    tenantId: string,
    filters?: {
      contentType?: string;
      difficulty?: number;
      faction?: string;
      attackType?: string;
      threatLevel?: string;
      season?: number;
      chapter?: number;
      isActive?: boolean;
    },
  ): Promise<EmailTemplateOutput[]>;
  listFallbackEmailTemplates(
    tenantId: string,
    filters?: {
      contentType?: string;
      difficulty?: number;
      faction?: string;
      attackType?: string;
      threatLevel?: string;
      season?: number;
      chapter?: number;
      isActive?: boolean;
    },
  ): Promise<EmailTemplateOutput[]>;
  createDocumentTemplate(tenantId: string, input: DocumentTemplateInput): Promise<{ id: string }>;
  createScenario(tenantId: string, input: ScenarioInput): Promise<{ id: string }>;
}

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
