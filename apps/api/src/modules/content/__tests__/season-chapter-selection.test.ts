import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterEach, describe, expect, it } from 'vitest';

import { createIsolatedDatabase, createIsolatedTestConfig } from '@the-dmz/shared/testing';

import { getDatabasePool } from '../../../shared/database/connection.js';
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

const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

const setupSeasonChapterTestDb = async (databaseName: string) => {
  const testConfig = createIsolatedTestConfig(databaseName);
  const cleanupDatabase = await createIsolatedDatabase(testConfig);
  cleanups.push(cleanupDatabase);
  const pool = getDatabasePool(testConfig);
  const db = drizzle(pool, {
    schema: {
      tenants,
      emailTemplates,
      scenarios,
      seasons,
      chapters,
      morpheusMessages,
    },
  }) as unknown as DB;
  await migrate(db, { migrationsFolder });
  return db;
};

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
    const db = await setupSeasonChapterTestDb(databaseName);

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
    const db = await setupSeasonChapterTestDb(databaseName);
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
    const db = await setupSeasonChapterTestDb(databaseName);
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
