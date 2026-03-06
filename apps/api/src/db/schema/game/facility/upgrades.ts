import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { facilityStates } from './states.js';

export const facilityUpgrades = pgTable('facility_upgrades', {
  id: uuid('id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  facilityStateId: uuid('facility_state_id')
    .notNull()
    .references(() => facilityStates.id, { onDelete: 'cascade' }),
  upgradeId: uuid('upgrade_id').notNull(),
  upgradeType: varchar('upgrade_type', { length: 16 }).notNull(),
  tierLevel: integer('tier_level').notNull().default(1),
  isCompleted: boolean('is_completed').notNull().default(false),
  completionDay: integer('completion_day'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type FacilityUpgrade = typeof facilityUpgrades.$inferSelect;
export type NewFacilityUpgrade = typeof facilityUpgrades.$inferInsert;
