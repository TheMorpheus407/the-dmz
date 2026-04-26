import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, describe, expect, it } from 'vitest';

import { createIsolatedDatabase, createIsolatedTestConfig } from '@the-dmz/shared/testing';

import { getDatabasePool } from '../../../shared/database/connection.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
import { emailTemplates } from '../../../db/schema/content/email-templates.schema.js';
import { findEmailTemplates, findFallbackEmailTemplates } from '../content.repo.js';

import type { DB } from '../../../shared/database/connection.js';

const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

const setupContentRepoTestDb = async (databaseName: string) => {
  const testConfig = createIsolatedTestConfig(databaseName);
  const cleanupDatabase = await createIsolatedDatabase(testConfig);
  cleanups.push(cleanupDatabase);
  const pool = getDatabasePool(testConfig);
  const db = drizzle(pool, {
    schema: {
      tenants,
      emailTemplates,
    },
  }) as unknown as DB;
  await migrate(db, { migrationsFolder });
  return db;
};

describe('content repository email template selection', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      if (cleanup) {
        await cleanup();
      }
    }
  });

  it('keeps primary list filters exact while fallback selection can still include generic templates', async () => {
    const databaseName = `dmz_test_content_repo_${randomUUID().replace(/-/g, '_')}`;
    const db = await setupContentRepoTestDb(databaseName);
    const tenantId = randomUUID();

    await db.insert(tenants).values({
      tenantId,
      name: 'Content Repo Tenant',
      slug: `content-repo-${tenantId.slice(0, 8)}`,
      status: 'active',
    });

    await db.insert(emailTemplates).values([
      {
        id: randomUUID(),
        tenantId,
        name: 'Generic Template',
        subject: 'Generic review request',
        body: 'Generic fallback body',
        contentType: 'email_phishing',
        difficulty: 4,
        faction: null,
        attackType: null,
        threatLevel: 'HIGH',
        season: null,
        chapter: null,
        metadata: {},
        isAiGenerated: false,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        name: 'Exact Match Template',
        subject: 'Targeted review request',
        body: 'Exact match body',
        contentType: 'email_phishing',
        difficulty: 4,
        faction: null,
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        season: 1,
        chapter: 2,
        metadata: {},
        isAiGenerated: false,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        name: 'Wrong Attack Template',
        subject: 'Wrong attack request',
        body: 'Wrong attack body',
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
      },
      {
        id: randomUUID(),
        tenantId,
        name: 'Stored AI Template',
        subject: 'AI-generated review request',
        body: 'Stored AI fallback body',
        contentType: 'email_phishing',
        difficulty: 4,
        faction: null,
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        season: 1,
        chapter: 2,
        metadata: {},
        isAiGenerated: true,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        name: 'Generated Payload Template',
        subject: 'Generated payload request',
        body: 'Generated payload fallback body',
        contentType: 'email_phishing',
        difficulty: 4,
        faction: null,
        attackType: 'spear_phishing',
        threatLevel: 'HIGH',
        season: 1,
        chapter: 2,
        metadata: {
          generatedContent: {
            headers: {
              subject: 'Generated payload request',
            },
          },
        },
        isAiGenerated: false,
        isActive: true,
      },
    ]);

    const filters = {
      contentType: 'email_phishing',
      difficulty: 4,
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      season: 1,
      chapter: 2,
      isActive: true,
    } as const;

    const primaryResults = await findEmailTemplates(db, tenantId, filters);
    const fallbackResults = await findFallbackEmailTemplates(db, tenantId, filters);

    expect(primaryResults).toHaveLength(3);
    expect(primaryResults.map((template) => template.name)).toEqual([
      'Exact Match Template',
      'Stored AI Template',
      'Generated Payload Template',
    ]);

    expect(fallbackResults).toHaveLength(2);
    expect(fallbackResults.map((template) => template.name)).toEqual([
      'Generic Template',
      'Exact Match Template',
    ]);
  });
});
