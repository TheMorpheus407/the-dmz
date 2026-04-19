import { randomUUID } from 'crypto';

import { drizzle } from 'drizzle-orm/postgres-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createIsolatedDatabase, createIsolatedTestConfig } from '@the-dmz/shared/testing';

import { tenants } from '../../shared/database/schema/tenants.js';
import { emailTemplates } from '../../db/schema/content/email-templates.schema.js';
import { createAiPipelineService } from '../ai-pipeline/ai-pipeline.service.js';
import { findFallbackEmailTemplates } from '../content/content.repo.js';

import type {
  AiPipelineLogger,
  ContentGateway,
  PromptTemplateRepository,
} from '../ai-pipeline/ai-pipeline.types.js';
import type { DB } from '../../shared/database/connection.js';
import type { Sql } from 'postgres';

const logger: AiPipelineLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const createRepository = (): PromptTemplateRepository => ({
  list: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(undefined),
  getActiveForGeneration: vi.fn().mockResolvedValue(undefined),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  recordGenerationLog: vi.fn().mockResolvedValue(undefined),
});

const createEventBus = () => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

const setupDatabase = async (pool: Sql): Promise<void> => {
  await pool.unsafe(`
    CREATE TABLE tenants (
      tenant_id uuid PRIMARY KEY NOT NULL,
      name varchar(255) NOT NULL,
      slug varchar(63) NOT NULL UNIQUE,
      domain varchar(255),
      plan_id varchar(32) DEFAULT 'free',
      status varchar(20) NOT NULL DEFAULT 'active',
      settings jsonb NOT NULL DEFAULT '{}'::jsonb,
      data_region varchar(16) DEFAULT 'eu',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE SCHEMA content;

    CREATE TABLE content.email_templates (
      id uuid PRIMARY KEY NOT NULL,
      tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
      name varchar(255) NOT NULL,
      subject varchar(500) NOT NULL,
      body text NOT NULL,
      from_name varchar(255),
      from_email varchar(255),
      reply_to varchar(255),
      content_type varchar(50) NOT NULL,
      difficulty integer NOT NULL,
      faction varchar(50),
      attack_type varchar(100),
      threat_level varchar(20) NOT NULL,
      season integer,
      chapter integer,
      language varchar(10) NOT NULL DEFAULT 'en',
      locale varchar(10) NOT NULL DEFAULT 'en-US',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      is_ai_generated boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );
  `);
};

const createDbMapper = (pool: Sql) =>
  drizzle(pool, {
    schema: {
      tenants,
      emailTemplates,
    },
  }) as unknown as DB;

describe('ai-pipeline fallback integration', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      if (cleanup) {
        await cleanup();
      }
    }
    vi.clearAllMocks();
  });

  it('reuses generic handcrafted fallback templates through the real content gateway query path', async () => {
    const databaseName = `dmz_test_ai_fallback_${randomUUID().replace(/-/g, '_')}`;
    const testConfig = createIsolatedTestConfig(databaseName);
    const { db, cleanup } = await createIsolatedDatabase(testConfig, {
      setup: setupDatabase,
      dbMapper: createDbMapper,
    });
    cleanups.push(cleanup);
    const tenantId = randomUUID();
    const tenantSlug = `ai-fallback-${tenantId.slice(0, 8)}`;

    await db.insert(tenants).values({
      tenantId,
      name: 'AI Pipeline Fallback Tenant',
      slug: tenantSlug,
      status: 'active',
    });

    await db.insert(emailTemplates).values({
      id: randomUUID(),
      name: 'Generic supply chain fallback',
      subject: 'Archive Relay Follow-up Review',
      body: [
        'Gatekeeper,',
        '',
        'Please review the relay follow-up request attached to this intake packet.',
        '',
        'The request matches the relay ticket already logged with records desk.',
        '',
        'Records Desk, Nexion Industries',
      ].join('\n'),
      fromName: 'Records Desk',
      fromEmail: 'records-desk@nexion.invalid',
      replyTo: 'records-desk@nexion.invalid',
      contentType: 'email_phishing',
      difficulty: 4,
      faction: null,
      attackType: 'supply_chain',
      threatLevel: 'HIGH',
      season: 1,
      chapter: 2,
      metadata: {},
      isAiGenerated: false,
      isActive: true,
      tenantId,
    });

    await db.insert(emailTemplates).values({
      id: randomUUID(),
      name: 'Wrong faction fallback',
      subject: 'Wrong Faction Template',
      body: 'This template should not match the request.',
      fromName: 'Records Desk',
      fromEmail: 'records-desk@librarians.test',
      replyTo: 'records-desk@librarians.test',
      contentType: 'email_phishing',
      difficulty: 4,
      faction: 'Librarians',
      attackType: 'supply_chain',
      threatLevel: 'HIGH',
      season: 1,
      chapter: 2,
      metadata: {},
      isAiGenerated: false,
      isActive: true,
      tenantId,
    });

    const requestedFallbackFilters = {
      isActive: true,
      contentType: 'email_phishing',
      difficulty: 4,
      faction: 'Nexion Industries',
      attackType: 'supply_chain',
      threatLevel: 'HIGH',
      season: 1,
      chapter: 2,
    } as const;

    const repoBackedTemplates = await findFallbackEmailTemplates(
      db,
      tenantId,
      requestedFallbackFilters,
    );
    expect(repoBackedTemplates.map((template) => template.name)).toEqual([
      'Generic supply chain fallback',
    ]);

    const mappedFallbackTemplates = repoBackedTemplates.map((template) => ({
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
        template.metadata &&
        typeof template.metadata === 'object' &&
        !Array.isArray(template.metadata)
          ? (template.metadata as Record<string, unknown>)
          : {},
    }));

    const contentGateway: ContentGateway = {
      createEmailTemplate: vi.fn().mockResolvedValue({ id: 'stored-fallback-email' }),
      listEmailTemplates: vi.fn().mockResolvedValue([]),
      listFallbackEmailTemplates: async (nextTenantId, filters) => {
        if (
          nextTenantId === tenantId &&
          filters?.contentType === requestedFallbackFilters.contentType &&
          filters?.difficulty === requestedFallbackFilters.difficulty &&
          filters?.faction === requestedFallbackFilters.faction &&
          filters?.attackType === requestedFallbackFilters.attackType &&
          filters?.threatLevel === requestedFallbackFilters.threatLevel &&
          filters?.season === requestedFallbackFilters.season &&
          filters?.chapter === requestedFallbackFilters.chapter
        ) {
          return mappedFallbackTemplates;
        }

        return [];
      },
      createDocumentTemplate: vi.fn(),
      createScenario: vi.fn(),
    };

    const service = createAiPipelineService({
      config: testConfig,
      eventBus: createEventBus(),
      logger,
      promptTemplateRepository: createRepository(),
      contentGateway,
      claudeClient: { complete: vi.fn() },
      generateId: () => 'req-db-backed-fallback',
    });

    const result = await service.generateEmail(tenantId, 'user-1', {
      category: 'email_phishing',
      faction: 'Nexion Industries',
      attackType: 'supply_chain',
      threatLevel: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 2,
    });

    expect(result.fallbackApplied).toBe(true);
    expect(result.failureCategory).toBe('template_unavailable');
    expect(result.content).toMatchObject({
      headers: {
        subject: 'Archive Relay Follow-up Review',
      },
      faction: 'Nexion Industries',
      attack_type: 'supply_chain',
      threat_level: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 2,
    });
    expect(result.content).not.toMatchObject({
      headers: {
        subject: 'Wrong Faction Template',
      },
    });
  });
});
