import { sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar, boolean, integer } from 'drizzle-orm/pg-core';

import { tenants } from './tenants.js';

export const socialProfileModes = [
  'anonymous_tenant',
  'pseudonymous_tenant',
  'employee_identifiable',
] as const;
export type SocialProfileMode = (typeof socialProfileModes)[number];

export const tenantPrivacySettings = pgTable(
  'tenant_privacy_settings',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' })
      .unique(),
    socialProfileMode: varchar('social_profile_mode', { length: 30 })
      .notNull()
      .default('anonymous_tenant'),
    requireConsentForSocialFeatures: boolean('require_consent_for_social_features')
      .notNull()
      .default(true),
    allowPublicProfiles: boolean('allow_public_profiles').notNull().default(false),
    enforceRealNamePolicy: boolean('enforce_real_name_policy').notNull().default(false),
    shareAchievementsWithEmployer: boolean('share_achievements_with_employer')
      .notNull()
      .default(false),
    shareLeaderboardWithEmployer: boolean('share_leaderboard_with_employer')
      .notNull()
      .default(false),
    dataRetentionDays: integer('data_retention_days'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('tenant_privacy_settings_tenant_idx').on(table.tenantId),
  }),
);

export type TenantPrivacySettings = typeof tenantPrivacySettings.$inferSelect;
export type NewTenantPrivacySettings = typeof tenantPrivacySettings.$inferInsert;

export const DEFAULT_PRIVACY_SETTINGS = {
  socialProfileMode: 'anonymous_tenant' as SocialProfileMode,
  requireConsentForSocialFeatures: true,
  allowPublicProfiles: false,
  enforceRealNamePolicy: false,
  shareAchievementsWithEmployer: false,
  shareLeaderboardWithEmployer: false,
  dataRetentionDays: 90,
};
