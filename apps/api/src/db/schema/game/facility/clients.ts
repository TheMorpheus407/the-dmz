import { sql } from 'drizzle-orm';
import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { facilityStates } from './states.js';

export const facilityClients = pgTable('facility_clients', {
  id: uuid('id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  facilityStateId: uuid('facility_state_id')
    .notNull()
    .references(() => facilityStates.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull(),
  clientName: varchar('client_name', { length: 128 }).notNull(),
  organization: varchar('organization', { length: 128 }).notNull(),
  rackUnitsU: integer('rack_units_u').notNull().default(0),
  powerKw: integer('power_kw').notNull().default(0),
  coolingTons: integer('cooling_tons').notNull().default(0),
  bandwidthMbps: integer('bandwidth_mbps').notNull().default(0),
  dailyRate: integer('daily_rate').notNull().default(0),
  leaseStartDay: integer('lease_start_day').notNull(),
  leaseEndDay: integer('lease_end_day'),
  isActive: uuid('is_active')
    .notNull()
    .default(sql`uuid_generate_v7()`),
  burstProfile: varchar('burst_profile', { length: 16 }).notNull().default('steady'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type FacilityClient = typeof facilityClients.$inferSelect;
export type NewFacilityClient = typeof facilityClients.$inferInsert;
