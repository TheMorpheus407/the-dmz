import { sql } from 'drizzle-orm';
import { index, pgSchema, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';

import { chatChannel } from './chat-channel.js';

const socialSchema = pgSchema('social');

export const moderationStatuses = ['approved', 'flagged', 'rejected'] as const;
export type ModerationStatus = (typeof moderationStatuses)[number];

export const chatMessage = socialSchema.table(
  'chat_message',
  {
    messageId: uuid('message_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => chatChannel.channelId, { onDelete: 'cascade' }),
    senderPlayerId: uuid('sender_player_id').notNull(),
    content: varchar('content', { length: 280 }).notNull(),
    moderationStatus: varchar('moderation_status', { length: 20 })
      .notNull()
      .default('approved')
      .$type<ModerationStatus>(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    channelIdx: index('chat_message_channel_idx').on(table.channelId),
    senderIdx: index('chat_message_sender_idx').on(table.senderPlayerId),
    createdAtIdx: index('chat_message_created_at_idx').on(table.createdAt),
    channelCreatedAtIdx: index('chat_message_channel_created_at_idx').on(
      table.channelId,
      table.createdAt,
    ),
  }),
);

export type ChatMessage = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
