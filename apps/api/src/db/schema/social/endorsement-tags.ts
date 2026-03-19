import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

const socialSchema = pgSchema('social');

export const endorsementTags = socialSchema.table(
  'endorsement_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tagKey: varchar('tag_key', { length: 50 }).notNull().unique(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    description: varchar('description', { length: 280 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tagKeyUnique: uniqueIndex('endorsement_tags_key_unique_idx').on(table.tagKey),
    isActiveIdx: index('endorsement_tags_active_idx').on(table.isActive),
  }),
);

export type EndorsementTag = typeof endorsementTags.$inferSelect;
export type NewEndorsementTag = typeof endorsementTags.$inferInsert;
