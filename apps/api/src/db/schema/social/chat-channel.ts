import { sql } from 'drizzle-orm';
import { index, pgSchema, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const channelTypes = ['party', 'guild', 'direct'] as const;
export type ChannelType = (typeof channelTypes)[number];

export const chatChannel = socialSchema.table(
  'chat_channel',
  {
    channelId: uuid('channel_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    channelType: varchar('channel_type', { length: 20 }).notNull().$type<ChannelType>(),
    partyId: uuid('party_id'),
    guildId: uuid('guild_id'),
    name: varchar('name', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('chat_channel_tenant_idx').on(table.tenantId),
    partyIdx: index('chat_channel_party_idx').on(table.partyId),
    guildIdx: index('chat_channel_guild_idx').on(table.guildId),
    typeTenantUnique: uniqueIndex('chat_channel_type_tenant_unique').on(
      table.channelType,
      table.tenantId,
    ),
  }),
);

export type ChatChannel = typeof chatChannel.$inferSelect;
export type NewChatChannel = typeof chatChannel.$inferInsert;
