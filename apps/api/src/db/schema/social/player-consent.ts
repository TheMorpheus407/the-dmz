import { sql } from 'drizzle-orm';
import {
  index,
  pgSchema,
  timestamp,
  uuid,
  varchar,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const consentTypes = [
  'social_features',
  'public_profile',
  'leaderboard_public',
  'data_processing',
] as const;
export type ConsentType = (typeof consentTypes)[number];

export const playerConsents = socialSchema.table(
  'player_consent',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    playerId: uuid('player_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    consentType: varchar('consent_type', { length: 30 }).notNull(),
    granted: boolean('granted').notNull().default(true),
    grantedAt: timestamp('granted_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    ipAddressHash: varchar('ip_address_hash', { length: 64 }),
    userAgent: varchar('user_agent', { length: 500 }),
  },
  (table) => ({
    playerConsentUnique: uniqueIndex('player_consent_player_tenant_type_unique').on(
      table.playerId,
      table.tenantId,
      table.consentType,
    ),
    tenantIdx: index('player_consent_tenant_idx').on(table.tenantId),
    playerIdx: index('player_consent_player_idx').on(table.playerId),
    consentTypeIdx: index('player_consent_type_idx').on(table.consentType),
  }),
);

export type PlayerConsent = typeof playerConsents.$inferSelect;
export type NewPlayerConsent = typeof playerConsents.$inferInsert;

export const CONSENT_FEATURE_MAP: Record<string, ConsentType[]> = {
  add_friends: ['social_features'],
  set_profile_public: ['public_profile'],
  public_leaderboard: ['leaderboard_public'],
  data_processing: ['data_processing'],
};

export const DEFAULT_CONSENT_TYPES: ConsentType[] = [...consentTypes];
