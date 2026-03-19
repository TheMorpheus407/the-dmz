import { boolean, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';

const contentSchema = pgSchema('content');

export const avatars = contentSchema.table('avatars', {
  id: varchar('id', { length: 36 }).primaryKey(),
  category: varchar('category', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});

export type Avatar = typeof avatars.$inferSelect;
export type NewAvatar = typeof avatars.$inferInsert;

export const avatarCategories = ['animal', 'robot', 'geometric', 'character'] as const;
export type AvatarCategory = (typeof avatarCategories)[number];
