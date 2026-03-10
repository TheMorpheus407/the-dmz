import { sql } from 'drizzle-orm';
import {
  index,
  boolean,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const contentSchema = pgSchema('content');

export const factions = contentSchema.table(
  'factions',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    factionKey: varchar('faction_key', { length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    motivations: text('motivations').notNull(),
    communicationStyle: varchar('communication_style', { length: 20 }).notNull(),
    initialReputation: integer('initial_reputation').notNull().default(50),
    metadata: jsonb('metadata').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('factions_tenant_idx').on(table.tenantId),
    keyIdx: index('factions_key_idx').on(table.factionKey),
  }),
);

export type Faction = typeof factions.$inferSelect;
export type NewFaction = typeof factions.$inferInsert;

export const factionRelations = contentSchema.table(
  'faction_relations',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    factionId: uuid('faction_id')
      .notNull()
      .references(() => factions.id, { onDelete: 'cascade' }),
    reputation: integer('reputation').notNull().default(50),
    lastInteractionDay: integer('last_interaction_day').notNull().default(0),
    interactionCount: integer('interaction_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('faction_relations_tenant_idx').on(table.tenantId),
    userIdx: index('faction_relations_user_idx').on(table.userId),
    factionIdx: index('faction_relations_faction_idx').on(table.factionId),
  }),
);

export type FactionRelation = typeof factionRelations.$inferSelect;
export type NewFactionRelation = typeof factionRelations.$inferInsert;

export const narrativeEvents = contentSchema.table(
  'narrative_events',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    eventKey: varchar('event_key', { length: 100 }).notNull(),
    factionKey: varchar('faction_key', { length: 50 }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    triggerType: varchar('trigger_type', { length: 50 }).notNull(),
    triggerThreshold: integer('trigger_threshold'),
    dayTriggered: integer('day_triggered').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('narrative_events_tenant_idx').on(table.tenantId),
    userIdx: index('narrative_events_user_idx').on(table.userId),
    keyIdx: index('narrative_events_key_idx').on(table.eventKey),
    dayIdx: index('narrative_events_day_idx').on(table.dayTriggered),
  }),
);

export type NarrativeEvent = typeof narrativeEvents.$inferSelect;
export type NewNarrativeEvent = typeof narrativeEvents.$inferInsert;

export const morpheusMessages = contentSchema.table(
  'morpheus_messages',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    messageKey: varchar('message_key', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    triggerType: varchar('trigger_type', { length: 50 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull().default('info'),
    minDay: integer('min_day'),
    maxDay: integer('max_day'),
    minTrustScore: integer('min_trust_score'),
    maxTrustScore: integer('max_trust_score'),
    minThreatLevel: varchar('min_threat_level', { length: 16 }),
    maxThreatLevel: varchar('max_threat_level', { length: 16 }),
    factionKey: varchar('faction_key', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('morpheus_messages_tenant_idx').on(table.tenantId),
    keyIdx: index('morpheus_messages_key_idx').on(table.messageKey),
    triggerIdx: index('morpheus_messages_trigger_idx').on(table.triggerType),
    activeIdx: index('morpheus_messages_active_idx').on(table.isActive),
  }),
);

export type MorpheusMessage = typeof morpheusMessages.$inferSelect;
export type NewMorpheusMessage = typeof morpheusMessages.$inferInsert;

export const playerNarrativeState = contentSchema.table(
  'player_narrative_state',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    userId: uuid('user_id').notNull(),
    currentSeason: integer('current_season').notNull().default(1),
    currentChapter: integer('current_chapter').notNull().default(1),
    currentAct: integer('current_act').notNull().default(1),
    milestonesReached: jsonb('milestones_reached').notNull().default([]),
    conversationsCompleted: jsonb('conversations_completed').notNull().default([]),
    lastMorpheusMessageDay: integer('last_morpheus_message_day').notNull().default(0),
    welcomeMessageShown: boolean('welcome_message_shown').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('player_narrative_state_tenant_idx').on(table.tenantId),
    userIdx: index('player_narrative_state_user_idx').on(table.userId),
  }),
);

export type PlayerNarrativeState = typeof playerNarrativeState.$inferSelect;
export type NewPlayerNarrativeState = typeof playerNarrativeState.$inferInsert;
