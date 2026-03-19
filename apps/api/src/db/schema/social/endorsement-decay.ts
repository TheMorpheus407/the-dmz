import { pgSchema, uuid, integer, jsonb, timestamp, index, foreignKey } from 'drizzle-orm/pg-core';

import { endorsements } from './endorsement.js';

const socialSchema = pgSchema('social');

export const endorsementDecay = socialSchema.table(
  'endorsement_decay',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    endorsementId: uuid('endorsement_id')
      .notNull()
      .references(() => endorsements.id, { onDelete: 'cascade' }),
    reputationImpact: integer('reputation_impact').notNull().default(10),
    decaySchedule: jsonb('decay_schedule').notNull().default({
      initialDecay: 0.9,
      decayIntervalDays: 30,
      finalDecay: 0.1,
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    decayedAt: timestamp('decayed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    endorsementIdIdx: index('endorsement_decay_endorsement_idx').on(table.endorsementId),
    decayedAtIdx: index('endorsement_decay_decayed_idx').on(table.decayedAt),
    endorsementFk: foreignKey({
      name: 'endorsement_decay_endorsement_fk',
      columns: [table.endorsementId],
      foreignColumns: [endorsements.id],
    }).onDelete('cascade'),
  }),
);

export type EndorsementDecay = typeof endorsementDecay.$inferSelect;
export type NewEndorsementDecay = typeof endorsementDecay.$inferInsert;

export const ENDORSEMENT_DECAY_DAYS = 90;
export const ENDORSEMENT_BASE_IMPACT = 10;
