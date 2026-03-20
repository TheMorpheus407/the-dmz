import { sql } from 'drizzle-orm';
import { index, pgSchema, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { playerProfiles } from '../social/player-profiles.js';

const multiplayerSchema = pgSchema('multiplayer');

export const partyStatuses = ['forming', 'ready', 'in_session', 'disbanded'] as const;
export type PartyStatus = (typeof partyStatuses)[number];

export const difficulties = ['training', 'standard', 'hardened', 'nightmare'] as const;
export type Difficulty = (typeof difficulties)[number];

export const party = multiplayerSchema.table(
  'party',
  {
    partyId: uuid('party_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    leaderId: uuid('leader_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).notNull().default('forming'),
    preferredRole: varchar('preferred_role', { length: 20 }),
    difficulty: varchar('difficulty', { length: 20 }).notNull().default('standard'),
    inviteCode: varchar('invite_code', { length: 8 }),
    inviteCodeExpiresAt: timestamp('invite_code_expires_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    inviteCodeIdx: uniqueIndex('party_invite_code_idx').on(table.inviteCode),
    leaderIdx: index('party_leader_idx').on(table.leaderId),
    tenantStatusIdx: index('party_tenant_status_idx').on(table.tenantId, table.status),
  }),
);

export type Party = typeof party.$inferSelect;
export type NewParty = typeof party.$inferInsert;
