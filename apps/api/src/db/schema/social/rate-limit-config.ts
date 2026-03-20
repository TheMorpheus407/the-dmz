import { sql } from 'drizzle-orm';
import { index, pgSchema, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const rateLimitActions = [
  'send_message',
  'send_friend_request',
  'create_forum_post',
  'report_submit',
] as const;
export type RateLimitAction = (typeof rateLimitActions)[number];

export const rateLimitConfig = socialSchema.table(
  'rate_limit_config',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.tenantId, {
      onDelete: 'restrict',
    }),
    action: varchar('action', { length: 30 }).notNull(),
    windowSeconds: varchar('window_seconds', { length: 20 }).notNull(),
    maxCount: varchar('max_count', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantActionUnique: uniqueIndex('rate_limit_config_tenant_action_unique').on(
      table.tenantId,
      table.action,
    ),
    tenantIdx: index('rate_limit_config_tenant_idx').on(table.tenantId),
    actionIdx: index('rate_limit_config_action_idx').on(table.action),
  }),
);

export type RateLimitConfig = typeof rateLimitConfig.$inferSelect;
export type NewRateLimitConfig = typeof rateLimitConfig.$inferInsert;

export const DEFAULT_RATE_LIMITS: Record<
  RateLimitAction,
  { windowSeconds: number; maxCount: number }
> = {
  send_message: { windowSeconds: 60, maxCount: 10 },
  send_friend_request: { windowSeconds: 3600, maxCount: 20 },
  create_forum_post: { windowSeconds: 3600, maxCount: 5 },
  report_submit: { windowSeconds: 3600, maxCount: 10 },
};
