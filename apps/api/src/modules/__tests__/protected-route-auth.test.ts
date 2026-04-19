import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const aiPipelineServiceMock = vi.hoisted(() => ({
  listPromptTemplates: vi.fn(),
  getPromptTemplate: vi.fn(),
  createPromptTemplate: vi.fn(),
  updatePromptTemplate: vi.fn(),
  deletePromptTemplate: vi.fn(),
  generateContent: vi.fn(),
  generateEmail: vi.fn(),
  generateIntelBrief: vi.fn(),
  generateScenarioVariation: vi.fn(),
}));

vi.mock('../ai-pipeline/ai-pipeline.service.js', async () => {
  const actual = await vi.importActual('../ai-pipeline/ai-pipeline.service.js');

  return {
    ...actual,
    createAiPipelineService: () => aiPipelineServiceMock,
  };
});

import { createIsolatedDatabase, createIsolatedTestConfig } from '@the-dmz/shared/testing';

import { buildApp } from '../../app.js';
import { type AppConfig } from '../../config.js';
import { closeDatabase, getDatabaseClient } from '../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../shared/database/seed.js';
import * as contentService from '../content/content.service.js';
import { getDefaultOutputSchema } from '../ai-pipeline/output-parser.service.js';

import type { FastifyInstance } from 'fastify';

const migrationsFolder = fileURLToPath(
  new URL('../../shared/database/migrations', import.meta.url),
);

const resetMockedServices = (): void => {
  aiPipelineServiceMock.listPromptTemplates.mockReset();
  aiPipelineServiceMock.getPromptTemplate.mockReset();
  aiPipelineServiceMock.createPromptTemplate.mockReset();
  aiPipelineServiceMock.updatePromptTemplate.mockReset();
  aiPipelineServiceMock.deletePromptTemplate.mockReset();
  aiPipelineServiceMock.generateContent.mockReset();
  aiPipelineServiceMock.generateEmail.mockReset();
  aiPipelineServiceMock.generateIntelBrief.mockReset();
  aiPipelineServiceMock.generateScenarioVariation.mockReset();
};

const registerUser = async (
  app: FastifyInstance,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `protected-route-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Protected Route Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register protected route test user: ${response.statusCode}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

describe('protected route auth integration', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    vi.restoreAllMocks();
    resetMockedServices();
    vi.spyOn(contentService, 'listEmailTemplates').mockResolvedValue([]);

    const databaseName = `dmz_t_pra_${randomUUID().replace(/-/g, '_')}`;
    testConfig = createIsolatedTestConfig(databaseName);
    cleanupDatabase = await createIsolatedDatabase(testConfig);

    const db = getDatabaseClient(testConfig);
    await migrate(db, { migrationsFolder });
    await db.execute(
      sql`ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "device_fingerprint" varchar(128)`,
    );
    await seedDatabase(testConfig);

    app = buildApp(testConfig, { skipHealthCheck: true });
    await app.ready();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (app) {
      await app.close();
    }
    app = undefined;
    await closeDatabase();
    if (cleanupDatabase) {
      await cleanupDatabase();
    }
    cleanupDatabase = undefined;
    testConfig = undefined;
  });

  it('denies prompt template access to authenticated users without admin permissions', async () => {
    if (!app) {
      throw new Error('App was not initialized');
    }

    const { accessToken } = await registerUser(app);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Runtime Prompt Template',
        category: 'email_phishing',
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email for {{faction}}.',
        outputSchema: getDefaultOutputSchema('email_phishing'),
        version: '1.0.0',
      },
    });

    expect(createResponse.statusCode).toBe(403);
    expect(createResponse.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'AUTH_INSUFFICIENT_PERMS',
        }),
      }),
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/prompt-templates?category=email_phishing',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(listResponse.statusCode).toBe(403);
    expect(aiPipelineServiceMock.createPromptTemplate).not.toHaveBeenCalled();
    expect(aiPipelineServiceMock.listPromptTemplates).not.toHaveBeenCalled();
  });

  it('allows prompt template CRUD after provisioning the seeded admin role model', async () => {
    if (!app) {
      throw new Error('App was not initialized');
    }
    if (!testConfig) {
      throw new Error('Test config was not initialized');
    }

    const { accessToken, user } = await registerUser(app);
    await seedTenantAuthModel(testConfig, user.tenantId, [
      { userId: user.id, role: 'super_admin' },
    ]);

    const createdAt = new Date('2026-03-01T00:00:00Z');
    const createdTemplate = {
      id: 'runtime-template-1',
      tenantId: user.tenantId,
      name: 'Runtime Prompt Template',
      category: 'email_phishing',
      description: null,
      attackType: null,
      threatLevel: null,
      difficulty: null,
      season: null,
      chapter: null,
      systemPrompt: 'Generate JSON only.',
      userTemplate: 'Generate a phishing email for {{faction}}.',
      outputSchema: getDefaultOutputSchema('email_phishing'),
      version: '1.0.0',
      tokenBudget: 1200,
      isActive: true,
      metadata: {},
      createdAt,
      updatedAt: createdAt,
    };
    aiPipelineServiceMock.createPromptTemplate.mockResolvedValue(createdTemplate);
    aiPipelineServiceMock.listPromptTemplates.mockResolvedValue([createdTemplate]);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: 'Runtime Prompt Template',
        category: 'email_phishing',
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email for {{faction}}.',
        outputSchema: getDefaultOutputSchema('email_phishing'),
        version: '1.0.0',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toEqual({
      data: expect.objectContaining({
        id: createdTemplate.id,
        name: 'Runtime Prompt Template',
      }),
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/prompt-templates?category=email_phishing',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      data: [expect.objectContaining({ id: createdTemplate.id })],
    });
  });

  it('denies content email listing to authenticated users without admin permissions', async () => {
    if (!app) {
      throw new Error('App was not initialized');
    }

    const { accessToken } = await registerUser(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/emails',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'AUTH_INSUFFICIENT_PERMS',
        }),
      }),
    );
  });

  it('lists content emails after provisioning the seeded admin role model', async () => {
    if (!app) {
      throw new Error('App was not initialized');
    }
    if (!testConfig) {
      throw new Error('Test config was not initialized');
    }

    const { accessToken, user } = await registerUser(app);
    await seedTenantAuthModel(testConfig, user.tenantId, [
      { userId: user.id, role: 'super_admin' },
    ]);

    vi.spyOn(contentService, 'listEmailTemplates').mockResolvedValue([
      {
        id: 'cacebdf6-7fc0-4810-a8aa-2c1334e77f20',
        tenantId: user.tenantId,
        name: 'Exact Match Template',
        subject: 'Please review today',
        body: 'Archive intake request body',
        fromName: null,
        fromEmail: null,
        replyTo: null,
        contentType: 'email_phishing',
        difficulty: 3,
        faction: null,
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        season: 1,
        chapter: 2,
        language: 'en',
        locale: 'en-US',
        metadata: {},
        isAiGenerated: false,
        isActive: true,
        createdAt: new Date('2026-03-01T00:00:00Z'),
        updatedAt: new Date('2026-03-01T00:00:00Z'),
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/emails?attackType=spear_phishing&season=1&chapter=2',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [expect.any(Object)],
    });
    expect(contentService.listEmailTemplates).toHaveBeenLastCalledWith(
      testConfig,
      user.tenantId,
      expect.objectContaining({
        attackType: 'spear_phishing',
        season: 1,
        chapter: 2,
      }),
    );
  });
});
