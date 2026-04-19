import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createIsolatedDatabase,
  createIsolatedTestConfig,
  createTestId,
} from '@the-dmz/shared/testing';

import { buildApp } from '../../app.js';
import { type AppConfig } from '../../config.js';
import { closeDatabase, getDatabaseClient } from '../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../shared/database/seed.js';
import { tenants } from '../../shared/database/schema/tenants.js';
import { getDefaultOutputSchema } from '../ai-pipeline/output-parser.service.js';

import type { FastifyInstance } from 'fastify';

const migrationsFolder = fileURLToPath(
  new URL('../../shared/database/migrations', import.meta.url),
);

const registerUser = async (
  app: FastifyInstance,
  tenantId?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    ...(tenantId
      ? {
          headers: {
            'x-tenant-id': tenantId,
          },
        }
      : {}),
    payload: {
      email: `ai-prompt-template-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'AI Prompt Template Test User',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register AI prompt template test user: ${response.statusCode}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

const createAdminUser = async (
  app: FastifyInstance,
  config: AppConfig,
  tenantId: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const registration = await registerUser(app, tenantId);
  await seedTenantAuthModel(config, registration.user.tenantId, [
    { userId: registration.user.id, role: 'super_admin' },
  ]);

  return registration;
};

const createTenant = async (
  config: AppConfig,
  tenant: { tenantId: string; name: string; slug: string },
): Promise<void> => {
  const db = getDatabaseClient(config);
  await db.insert(tenants).values({
    tenantId: tenant.tenantId,
    name: tenant.name,
    slug: tenant.slug,
    status: 'active',
  });
};

describe('ai prompt template integration', () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  beforeEach(async () => {
    const databaseName = `dmz_t_ai_prompt_${randomUUID().replace(/-/g, '_')}`;
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

  it('executes prompt-template CRUD through the real Fastify, tenant context, and RLS path', async () => {
    if (!app || !testConfig) {
      throw new Error('Test app was not initialized');
    }
    const testApp = app;
    const currentConfig = testConfig;

    const tenantId = randomUUID();
    await createTenant(currentConfig, {
      tenantId,
      name: 'AI Prompt Template Tenant',
      slug: `ai-prompt-template-${tenantId.slice(0, 8)}`,
    });

    const adminUser = await createAdminUser(testApp, currentConfig, tenantId);

    const createResponse = await testApp.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
      payload: {
        name: 'Runtime Prompt Template',
        category: 'email_phishing',
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        difficulty: 4,
        season: 1,
        chapter: 1,
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email for {{faction}}.',
        outputSchema: getDefaultOutputSchema('email_phishing'),
        version: '1.0.0',
        tokenBudget: 900,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const createdTemplate = createResponse.json() as {
      data: {
        id: string;
        name: string;
        tokenBudget: number;
        tenantId: string;
        isActive: boolean;
      };
    };

    expect(createdTemplate.data).toEqual(
      expect.objectContaining({
        name: 'Runtime Prompt Template',
        tokenBudget: 900,
        tenantId: adminUser.user.tenantId,
        isActive: true,
      }),
    );

    const listResponse = await testApp.inject({
      method: 'GET',
      url: '/api/v1/ai/prompt-templates?category=email_phishing&difficulty=4',
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      data: [
        expect.objectContaining({
          id: createdTemplate.data.id,
          name: 'Runtime Prompt Template',
        }),
      ],
    });

    const getResponse = await testApp.inject({
      method: 'GET',
      url: `/api/v1/ai/prompt-templates/${createdTemplate.data.id}`,
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({
      data: expect.objectContaining({
        id: createdTemplate.data.id,
        tenantId: adminUser.user.tenantId,
      }),
    });

    const updateResponse = await testApp.inject({
      method: 'PATCH',
      url: `/api/v1/ai/prompt-templates/${createdTemplate.data.id}`,
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
      payload: {
        name: 'Updated Runtime Prompt Template',
        tokenBudget: 1200,
        isActive: false,
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toEqual({
      data: expect.objectContaining({
        id: createdTemplate.data.id,
        name: 'Updated Runtime Prompt Template',
        tokenBudget: 1200,
        isActive: false,
      }),
    });

    const deleteResponse = await testApp.inject({
      method: 'DELETE',
      url: `/api/v1/ai/prompt-templates/${createdTemplate.data.id}`,
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
    });

    expect(deleteResponse.statusCode).toBe(204);
    expect(deleteResponse.body).toBe('');

    const missingResponse = await testApp.inject({
      method: 'GET',
      url: `/api/v1/ai/prompt-templates/${createdTemplate.data.id}`,
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
    });

    expect(missingResponse.statusCode).toBe(404);
  });

  it('returns a conflict response for duplicate prompt-template create and update requests', async () => {
    if (!app || !testConfig) {
      throw new Error('Test app was not initialized');
    }
    const testApp = app;
    const currentConfig = testConfig;

    const tenantId = randomUUID();
    await createTenant(currentConfig, {
      tenantId,
      name: 'AI Prompt Template Conflict Tenant',
      slug: `ai-prompt-conflict-${tenantId.slice(0, 8)}`,
    });

    const adminUser = await createAdminUser(testApp, currentConfig, tenantId);
    const basePayload = {
      category: 'email_phishing',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      difficulty: 4,
      season: 1,
      chapter: 1,
      systemPrompt: 'Generate JSON only.',
      userTemplate: 'Generate a phishing email for {{faction}}.',
      outputSchema: getDefaultOutputSchema('email_phishing'),
      version: '1.0.0',
    };

    const createPrimaryResponse = await testApp.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
      payload: {
        ...basePayload,
        name: 'Duplicate Runtime Prompt Template',
      },
    });

    expect(createPrimaryResponse.statusCode).toBe(201);

    const duplicateCreateResponse = await testApp.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
      payload: {
        ...basePayload,
        name: 'Duplicate Runtime Prompt Template',
      },
    });

    expect(duplicateCreateResponse.statusCode).toBe(409);
    expect(duplicateCreateResponse.json()).toEqual(
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

    const createSecondaryResponse = await testApp.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
      payload: {
        ...basePayload,
        name: 'Secondary Runtime Prompt Template',
      },
    });

    expect(createSecondaryResponse.statusCode).toBe(201);
    const {
      data: { id: secondaryTemplateId },
    } = createSecondaryResponse.json() as { data: { id: string } };

    const duplicateUpdateResponse = await testApp.inject({
      method: 'PATCH',
      url: `/api/v1/ai/prompt-templates/${secondaryTemplateId}`,
      headers: {
        authorization: `Bearer ${adminUser.accessToken}`,
      },
      payload: {
        name: 'Duplicate Runtime Prompt Template',
      },
    });

    expect(duplicateUpdateResponse.statusCode).toBe(409);
    expect(duplicateUpdateResponse.json()).toEqual(
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

  it('maintains tenant isolation for prompt-template reads under parallel authenticated traffic', async () => {
    if (!app || !testConfig) {
      throw new Error('Test app was not initialized');
    }
    const testApp = app;
    const currentConfig = testConfig;

    const tenantOneId = randomUUID();
    const tenantTwoId = randomUUID();

    await createTenant(currentConfig, {
      tenantId: tenantOneId,
      name: 'AI Prompt Tenant One',
      slug: `ai-prompt-one-${tenantOneId.slice(0, 8)}`,
    });
    await createTenant(currentConfig, {
      tenantId: tenantTwoId,
      name: 'AI Prompt Tenant Two',
      slug: `ai-prompt-two-${tenantTwoId.slice(0, 8)}`,
    });

    const adminOne = await createAdminUser(testApp, currentConfig, tenantOneId);
    const adminTwo = await createAdminUser(testApp, currentConfig, tenantTwoId);

    const createResponse = await testApp.inject({
      method: 'POST',
      url: '/api/v1/ai/prompt-templates',
      headers: {
        authorization: `Bearer ${adminOne.accessToken}`,
      },
      payload: {
        name: 'Tenant One Template',
        category: 'email_phishing',
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        difficulty: 4,
        season: 1,
        chapter: 1,
        systemPrompt: 'Generate JSON only.',
        userTemplate: 'Generate a phishing email for {{faction}}.',
        outputSchema: getDefaultOutputSchema('email_phishing'),
        version: '1.0.0',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const {
      data: { id: templateId },
    } = createResponse.json() as { data: { id: string } };

    const tenantTwoListResponse = await testApp.inject({
      method: 'GET',
      url: '/api/v1/ai/prompt-templates?category=email_phishing',
      headers: {
        authorization: `Bearer ${adminTwo.accessToken}`,
      },
    });

    expect(tenantTwoListResponse.statusCode).toBe(200);
    expect(tenantTwoListResponse.json()).toEqual({ data: [] });

    const tenantTwoGetResponse = await testApp.inject({
      method: 'GET',
      url: `/api/v1/ai/prompt-templates/${templateId}`,
      headers: {
        authorization: `Bearer ${adminTwo.accessToken}`,
      },
    });

    expect(tenantTwoGetResponse.statusCode).toBe(404);

    const parallelResults = await Promise.all(
      Array.from({ length: 8 }).map(async () => {
        const [tenantOneRead, tenantTwoRead] = await Promise.all([
          testApp.inject({
            method: 'GET',
            url: `/api/v1/ai/prompt-templates/${templateId}`,
            headers: {
              authorization: `Bearer ${adminOne.accessToken}`,
            },
          }),
          testApp.inject({
            method: 'GET',
            url: `/api/v1/ai/prompt-templates/${templateId}`,
            headers: {
              authorization: `Bearer ${adminTwo.accessToken}`,
            },
          }),
        ]);

        return { tenantOneRead, tenantTwoRead };
      }),
    );

    for (const result of parallelResults) {
      expect(result.tenantOneRead.statusCode).toBe(200);
      expect(result.tenantOneRead.json()).toEqual({
        data: expect.objectContaining({
          id: templateId,
          tenantId: adminOne.user.tenantId,
        }),
      });

      expect(result.tenantTwoRead.statusCode).toBe(404);
    }
  });
});
