import { randomUUID } from 'crypto';

import { drizzle } from 'drizzle-orm/postgres-js';
import { afterEach, describe, expect, it } from 'vitest';

import { createIsolatedDatabase, createIsolatedTestConfig } from '@the-dmz/shared/testing';

import { tenants } from '../../../shared/database/schema/tenants.js';
import {
  emailTemplates,
  scenarios,
  seasons,
  chapters,
  morpheusMessages,
} from '../../../db/schema/content/index.js';
import {
  findEmailTemplates,
  findSeasons,
  findChaptersBySeason,
  findMorpheusMessagesByTrigger,
  findMorpheusMessageByKey,
} from '../content.repo.js';

import type { DB } from '../../../shared/database/connection.js';
import type { Sql } from 'postgres';

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

    CREATE TABLE content.seasons (
      id uuid PRIMARY KEY NOT NULL,
      tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
      season_number integer NOT NULL,
      title varchar(255) NOT NULL,
      theme text NOT NULL,
      logline text NOT NULL,
      description text,
      threat_curve_start varchar(20) NOT NULL DEFAULT 'LOW',
      threat_curve_end varchar(20) NOT NULL DEFAULT 'HIGH',
      is_active boolean NOT NULL DEFAULT true,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE content.chapters (
      id uuid PRIMARY KEY NOT NULL,
      tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
      season_id uuid NOT NULL REFERENCES content.seasons(id) ON DELETE CASCADE,
      chapter_number integer NOT NULL,
      act integer NOT NULL,
      title varchar(255) NOT NULL,
      description text,
      day_start integer NOT NULL,
      day_end integer NOT NULL,
      difficulty_start integer NOT NULL DEFAULT 1,
      difficulty_end integer NOT NULL DEFAULT 2,
      threat_level varchar(20) NOT NULL DEFAULT 'LOW',
      is_active boolean NOT NULL DEFAULT true,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

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

    CREATE TABLE content.scenarios (
      id uuid PRIMARY KEY NOT NULL,
      tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
      name varchar(255) NOT NULL,
      description text,
      difficulty integer NOT NULL,
      faction varchar(50),
      season integer,
      chapter integer,
      language varchar(10) NOT NULL DEFAULT 'en',
      locale varchar(10) NOT NULL DEFAULT 'en-US',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE content.morpheus_messages (
      id uuid PRIMARY KEY NOT NULL,
      tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
      message_key varchar(100) NOT NULL,
      title varchar(255) NOT NULL,
      content text NOT NULL,
      trigger_type varchar(50) NOT NULL,
      severity varchar(20) NOT NULL DEFAULT 'info',
      min_day integer,
      max_day integer,
      min_trust_score integer,
      max_trust_score integer,
      min_threat_level varchar(16),
      max_threat_level varchar(16),
      faction_key varchar(50),
      is_active boolean NOT NULL DEFAULT true,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
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
      scenarios,
      seasons,
      chapters,
      morpheusMessages,
    },
  }) as unknown as DB;

describe('content repository season and chapter selection', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      if (cleanup) {
        await cleanup();
      }
    }
  });

  it('creates and retrieves seasons and chapters correctly', async () => {
    const databaseName = `dmz_test_content_season_${randomUUID().replace(/-/g, '_')}`;
    const testConfig = createIsolatedTestConfig(databaseName);
    const { db, cleanup } = await createIsolatedDatabase(testConfig, {
      setup: setupDatabase,
      dbMapper: createDbMapper,
    });
    cleanups.push(cleanup);

    const tenantId = randomUUID();

    await db.insert(tenants).values({
      tenantId,
      name: 'Season Test Tenant',
      slug: `season-test-${tenantId.slice(0, 8)}`,
      status: 'active',
    });

    const [season] = await db
      .insert(seasons)
      .values({
        id: randomUUID(),
        tenantId,
        seasonNumber: 1,
        title: 'Signal Loss',
        theme: 'Survival through disciplined trust',
        logline: 'The operator establishes the last reliable gate',
        description: 'First season content',
        threatCurveStart: 'LOW',
        threatCurveEnd: 'HIGH',
        isActive: true,
        metadata: {},
      })
      .returning();

    if (!season) {
      throw new Error('Failed to create season');
    }

    const [_chapter1] = await db
      .insert(chapters)
      .values({
        id: randomUUID(),
        tenantId,
        seasonId: season.id,
        chapterNumber: 1,
        act: 1,
        title: 'Day Zero Intake',
        description: 'First chapter',
        dayStart: 1,
        dayEnd: 3,
        difficultyStart: 1,
        difficultyEnd: 1,
        threatLevel: 'LOW',
        isActive: true,
        metadata: {},
      })
      .returning();

    const [_chapter2] = await db
      .insert(chapters)
      .values({
        id: randomUUID(),
        tenantId,
        seasonId: season.id,
        chapterNumber: 2,
        act: 1,
        title: 'First Decisions',
        description: 'Second chapter',
        dayStart: 4,
        dayEnd: 7,
        difficultyStart: 1,
        difficultyEnd: 2,
        threatLevel: 'LOW',
        isActive: true,
        metadata: {},
      })
      .returning();

    const foundSeasons = await findSeasons(db, tenantId, { seasonNumber: 1 });
    expect(foundSeasons).toHaveLength(1);
    expect(foundSeasons[0]?.title).toBe('Signal Loss');

    const foundChapters = await findChaptersBySeason(db, tenantId, season.id);
    expect(foundChapters).toHaveLength(2);
    expect(foundChapters.map((c) => c.chapterNumber)).toEqual([1, 2]);

    const act1Chapters = await findChaptersBySeason(db, tenantId, season.id, { act: 1 });
    expect(act1Chapters).toHaveLength(2);
  });

  it('retrieves email templates by season and difficulty', async () => {
    const databaseName = `dmz_test_content_email_${randomUUID().replace(/-/g, '_')}`;
    const testConfig = createIsolatedTestConfig(databaseName);
    const { db, cleanup } = await createIsolatedDatabase(testConfig, {
      setup: setupDatabase,
      dbMapper: createDbMapper,
    });
    cleanups.push(cleanup);

    const tenantId = randomUUID();

    await db.insert(tenants).values({
      tenantId,
      name: 'Email Test Tenant',
      slug: `email-test-${tenantId.slice(0, 8)}`,
      status: 'active',
    });

    await db.insert(emailTemplates).values([
      {
        id: randomUUID(),
        tenantId,
        name: 'Easy Phishing Email',
        subject: 'URGENT: Account Suspended',
        body: 'Click here now!',
        contentType: 'phishing',
        difficulty: 1,
        faction: 'criminal_networks',
        attackType: 'phishing',
        threatLevel: 'LOW',
        season: 1,
        chapter: 1,
        metadata: {},
        isAiGenerated: false,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        name: 'Medium Phishing Email',
        subject: 'Invoice Payment Required',
        body: 'Please pay within 3 days',
        contentType: 'phishing',
        difficulty: 2,
        faction: 'nexion_industries',
        attackType: 'spear_phishing',
        threatLevel: 'GUARDED',
        season: 1,
        chapter: 2,
        metadata: {},
        isAiGenerated: false,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        name: 'Season 2 Email',
        subject: 'Season 2 Email',
        body: 'Different season',
        contentType: 'phishing',
        difficulty: 2,
        faction: 'librarians',
        attackType: 'phishing',
        threatLevel: 'ELEVATED',
        season: 2,
        chapter: 1,
        metadata: {},
        isAiGenerated: false,
        isActive: true,
      },
    ]);

    const season1Emails = await findEmailTemplates(db, tenantId, { season: 1 });
    expect(season1Emails).toHaveLength(2);

    const difficulty1Emails = await findEmailTemplates(db, tenantId, { difficulty: 1 });
    expect(difficulty1Emails).toHaveLength(1);

    const chapter1Emails = await findEmailTemplates(db, tenantId, { season: 1, chapter: 1 });
    expect(chapter1Emails).toHaveLength(1);
  });

  it('retrieves morpheus messages by trigger and day', async () => {
    const databaseName = `dmz_test_content_narrative_${randomUUID().replace(/-/g, '_')}`;
    const testConfig = createIsolatedTestConfig(databaseName);
    const { db, cleanup } = await createIsolatedDatabase(testConfig, {
      setup: setupDatabase,
      dbMapper: createDbMapper,
    });
    cleanups.push(cleanup);

    const tenantId = randomUUID();

    await db.insert(tenants).values({
      tenantId,
      name: 'Narrative Test Tenant',
      slug: `narrative-test-${tenantId.slice(0, 8)}`,
      status: 'active',
    });

    await db.insert(morpheusMessages).values([
      {
        id: randomUUID(),
        tenantId,
        messageKey: 'welcome_day_zero',
        title: 'Welcome to the Gate',
        content: 'Welcome message content',
        triggerType: 'day_start',
        severity: 'info',
        minDay: 1,
        maxDay: 1,
        metadata: {},
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        messageKey: 'day_one_first_email',
        title: 'Your First Request',
        content: 'First email content',
        triggerType: 'email_received',
        severity: 'info',
        minDay: 1,
        maxDay: 3,
        metadata: {},
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        messageKey: 'difficulty_ramp',
        title: 'Escalation Begins',
        content: 'Difficulty ramp content',
        triggerType: 'chapter_start',
        severity: 'info',
        minDay: 4,
        metadata: {},
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        messageKey: 'faction_sovcomp_intro',
        title: 'Sovereign Compact',
        content: 'Faction intro content',
        triggerType: 'faction_intro',
        severity: 'info',
        factionKey: 'sovereign_compact',
        metadata: {},
        isActive: true,
      },
    ]);

    const dayStartMessages = await findMorpheusMessagesByTrigger(db, tenantId, 'day_start', {
      day: 1,
    });
    expect(dayStartMessages).toHaveLength(1);
    expect(dayStartMessages[0]?.messageKey).toBe('welcome_day_zero');

    const chapterStartMessages = await findMorpheusMessagesByTrigger(
      db,
      tenantId,
      'chapter_start',
      { day: 5 },
    );
    expect(chapterStartMessages).toHaveLength(1);

    const factionMessages = await findMorpheusMessagesByTrigger(db, tenantId, 'faction_intro', {
      factionKey: 'sovereign_compact',
    });
    expect(factionMessages).toHaveLength(1);

    const byKey = await findMorpheusMessageByKey(db, tenantId, 'welcome_day_zero');
    expect(byKey?.title).toBe('Welcome to the Gate');
  });
});
