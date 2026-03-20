import { jsonb, pgSchema, varchar } from 'drizzle-orm/pg-core';

const multiplayerSchema = pgSchema('multiplayer');

export const coopScenario = multiplayerSchema.table('coop_scenario', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  threatDomain: varchar('threat_domain', { length: 100 }).array(),
  difficultyTiers: varchar('difficulty_tier', { length: 20 }).array(),
  emailRouting: varchar('email_routing', { length: 20 }),
  uniqueMechanics: jsonb('unique_mechanics').$type<Record<string, unknown>>(),
  phaseOverrides: jsonb('phase_overrides').$type<Record<string, unknown>>(),
  successConditions: jsonb('success_conditions').$type<Record<string, unknown>>(),
  failureConditions: jsonb('failure_conditions').$type<Record<string, unknown>>(),
  narrativeSetup: varchar('narrative_setup', { length: 500 }),
  narrativeExit: varchar('narrative_exit', { length: 500 }),
});

export type CoopScenario = typeof coopScenario.$inferSelect;
export type NewCoopScenario = typeof coopScenario.$inferInsert;
