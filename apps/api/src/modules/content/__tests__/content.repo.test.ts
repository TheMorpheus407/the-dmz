import { randomUUID } from 'crypto';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig, type AppConfig } from '../../../config.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
import { emailTemplates } from '../../../db/schema/content/email-templates.schema.js';
import { findEmailTemplates, findFallbackEmailTemplates } from '../content.repo.js';

import type { DB } from '../../../shared/database/connection.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
  };
};

const createIsolatedTestConfig = (databaseName: string): AppConfig => ({
  ...createTestConfig(),
  DATABASE_URL: `postgresql://dmz:dmz_dev@localhost:5432/${databaseName}`,
});

const adminDatabaseUrl = 'postgresql://dmz:dmz_dev@localhost:5432/postgres';

const createIsolatedDatabase = async (
  config: AppConfig,
): Promise<{
  db: DB;
  cleanup: () => Promise<void>;
}> => {
  const databaseName = new URL(config.DATABASE_URL).pathname.replace(/^\//, '');
  const adminPool = postgres(adminDatabaseUrl, { max: 1 });
  const databasePool = postgres(config.DATABASE_URL, { max: 1 });

  const cleanup = async (): Promise<void> => {
    await databasePool.end({ timeout: 5 });
    await adminPool.unsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${databaseName}'
        AND pid <> pg_backend_pid()
    `);
    await adminPool.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end({ timeout: 5 });
  };

  try {
    await adminPool.unsafe(`CREATE DATABASE "${databaseName}"`);

    await databasePool.unsafe(`
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

    const db = drizzle(databasePool, {
      schema: {
        tenants,
        emailTemplates,
      },
    }) as unknown as DB;

    return {
      db,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
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
    const testConfig = createIsolatedTestConfig(databaseName);
    const { db, cleanup } = await createIsolatedDatabase(testConfig);
    cleanups.push(cleanup);

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
