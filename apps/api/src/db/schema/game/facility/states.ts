import { sql } from 'drizzle-orm';
import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { gameSessions } from '../game-sessions.js';

export const facilityStates = pgTable('facility_states', {
  id: uuid('id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => gameSessions.id, { onDelete: 'cascade' }),
  tier: varchar('tier', { length: 16 }).notNull().default('outpost'),
  rackCapacityU: integer('rack_capacity_u').notNull().default(42),
  powerCapacityKw: integer('power_capacity_kw').notNull().default(10),
  coolingCapacityTons: integer('cooling_capacity_tons').notNull().default(5),
  bandwidthCapacityMbps: integer('bandwidth_capacity_mbps').notNull().default(100),
  rackUsedU: integer('rack_used_u').notNull().default(0),
  powerUsedKw: integer('power_used_kw').notNull().default(0),
  coolingUsedTons: integer('cooling_used_tons').notNull().default(0),
  bandwidthUsedMbps: integer('bandwidth_used_mbps').notNull().default(0),
  maintenanceDebt: integer('maintenance_debt').notNull().default(0),
  facilityHealth: integer('facility_health').notNull().default(100),
  operatingCostPerDay: integer('operating_cost_per_day').notNull().default(50),
  attackSurfaceScore: integer('attack_surface_score').notNull().default(10),
  lastTickDay: integer('last_tick_day').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type FacilityState = typeof facilityStates.$inferSelect;
export type NewFacilityState = typeof facilityStates.$inferInsert;
