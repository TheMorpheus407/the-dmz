import { sql } from 'drizzle-orm';
import {
  index,
  pgSchema,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  jsonb,
  numeric,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const ltiSchema = pgSchema('lti');

export const ltiPlatforms = ltiSchema.table(
  'lti_platforms',
  {
    platformId: uuid('platform_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    platformUrl: varchar('platform_url', { length: 2048 }).notNull(),
    clientId: varchar('client_id', { length: 255 }).notNull(),
    deploymentId: varchar('deployment_id', { length: 255 }),
    publicKeysetUrl: varchar('public_keyset_url', { length: 2048 }).notNull(),
    authTokenUrl: varchar('auth_token_url', { length: 2048 }).notNull(),
    authLoginUrl: varchar('auth_login_url', { length: 2048 }).notNull(),
    jwks: jsonb('jwks').notNull().default({}),
    toolUrl: varchar('tool_url', { length: 2048 }),
    isActive: boolean('is_active').notNull().default(true),
    lastValidationStatus: varchar('last_validation_status', { length: 32 }),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lti_platforms_tenant_idx').on(table.tenantId),
    clientIdIdx: index('lti_platforms_client_id_idx').on(table.clientId),
    platformUrlIdx: index('lti_platforms_platform_url_idx').on(table.platformUrl),
  }),
);

export const ltiNonces = ltiSchema.table(
  'lti_nonces',
  {
    nonceId: uuid('nonce_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    nonceValue: varchar('nonce_value', { length: 255 }).notNull().unique(),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => ltiPlatforms.platformId, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    nonceValueIdx: index('lti_nonces_nonce_idx').on(table.nonceValue),
    expiresAtIdx: index('lti_nonces_expires_idx').on(table.expiresAt),
    platformIdIdx: index('lti_nonces_platform_idx').on(table.platformId),
  }),
);

export const ltiDeepLinkContent = ltiSchema.table(
  'lti_deep_link_content',
  {
    contentId: uuid('content_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => ltiPlatforms.platformId, { onDelete: 'cascade' }),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    url: varchar('url', { length: 2048 }),
    lineItemId: uuid('line_item_id'),
    customParams: jsonb('custom_params').default({}),
    available: boolean('available').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lti_deep_link_content_tenant_idx').on(table.tenantId),
    platformIdIdx: index('lti_deep_link_content_platform_idx').on(table.platformId),
  }),
);

export const ltiLineItems = ltiSchema.table(
  'lti_line_items',
  {
    lineItemId: uuid('line_item_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => ltiPlatforms.platformId, { onDelete: 'cascade' }),
    resourceLinkId: varchar('resource_link_id', { length: 255 }),
    label: varchar('label', { length: 255 }).notNull(),
    scoreMaximum: integer('score_maximum').notNull().default(100),
    resourceId: varchar('resource_id', { length: 255 }),
    tag: varchar('tag', { length: 255 }),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lti_line_items_tenant_idx').on(table.tenantId),
    platformIdIdx: index('lti_line_items_platform_idx').on(table.platformId),
    resourceLinkIdIdx: index('lti_line_items_resource_link_idx').on(table.resourceLinkId),
  }),
);

export const ltiScores = ltiSchema.table(
  'lti_scores',
  {
    scoreId: uuid('score_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    lineItemId: uuid('line_item_id')
      .notNull()
      .references(() => ltiLineItems.lineItemId, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull(),
    scoreGiven: numeric('score_given', { precision: 5, scale: 2 }),
    scoreMaximum: integer('score_maximum').notNull().default(100),
    activityProgress: varchar('activity_progress', { length: 32 }).notNull().default('initialized'),
    gradingProgress: varchar('grading_progress', { length: 32 }).notNull().default('pending'),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lti_scores_tenant_idx').on(table.tenantId),
    lineItemIdIdx: index('lti_scores_line_item_idx').on(table.lineItemId),
    userIdIdx: index('lti_scores_user_idx').on(table.userId),
  }),
);

export const ltiSessions = ltiSchema.table(
  'lti_sessions',
  {
    sessionId: uuid('session_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => ltiPlatforms.platformId, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }),
    resourceLinkId: varchar('resource_link_id', { length: 255 }),
    contextId: varchar('context_id', { length: 255 }),
    roles: jsonb('roles').default([]),
    launchId: varchar('launch_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lti_sessions_tenant_idx').on(table.tenantId),
    platformIdIdx: index('lti_sessions_platform_idx').on(table.platformId),
    launchIdIdx: index('lti_sessions_launch_id_idx').on(table.launchId),
  }),
);

export const ltiStates = ltiSchema.table(
  'lti_states',
  {
    stateId: uuid('state_id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    stateValue: varchar('state_value', { length: 255 }).notNull().unique(),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => ltiPlatforms.platformId, { onDelete: 'cascade' }),
    codeVerifier: varchar('code_verifier', { length: 128 }),
    redirectUri: varchar('redirect_uri', { length: 2048 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    stateValueIdx: index('lti_states_state_idx').on(table.stateValue),
    expiresAtIdx: index('lti_states_expires_idx').on(table.expiresAt),
    platformIdIdx: index('lti_states_platform_idx').on(table.platformId),
  }),
);

export type LtiPlatform = typeof ltiPlatforms.$inferSelect;
export type LtiPlatformInsert = typeof ltiPlatforms.$inferInsert;
export type LtiNonce = typeof ltiNonces.$inferSelect;
export type LtiNonceInsert = typeof ltiNonces.$inferInsert;
export type LtiDeepLinkContentItem = typeof ltiDeepLinkContent.$inferSelect;
export type LtiDeepLinkContentItemInsert = typeof ltiDeepLinkContent.$inferInsert;
export type LtiLineItem = typeof ltiLineItems.$inferSelect;
export type LtiLineItemInsert = typeof ltiLineItems.$inferInsert;
export type LtiScore = typeof ltiScores.$inferSelect;
export type LtiScoreInsert = typeof ltiScores.$inferInsert;
export type LtiSession = typeof ltiSessions.$inferSelect;
export type LtiSessionInsert = typeof ltiSessions.$inferInsert;
export type LtiState = typeof ltiStates.$inferSelect;
export type LtiStateInsert = typeof ltiStates.$inferInsert;
