import { eq, and, desc, sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { getRedisClient, type RedisRateLimitClient } from '../../shared/database/redis.js';
import {
  chatChannel,
  chatMessage,
  moderationReport,
  type ChannelType,
  type ChatChannel,
  type ChatMessage,
  type ModerationStatus,
} from '../../db/schema/social/index.js';
import { evaluateFlag } from '../feature-flags/feature-flags.service.js'; // eslint-disable-line import-x/no-restricted-paths
import { wsGateway, buildChannelName } from '../notification/websocket/websocket.gateway.js'; // eslint-disable-line import-x/no-restricted-paths
import { checkContent } from '../social/content-filter.service.js'; // eslint-disable-line import-x/no-restricted-paths

import type { AppConfig } from '../../config.js';
import type { WSServerMessage } from '../notification/websocket/websocket.types.js'; // eslint-disable-line import-x/no-restricted-paths

const MAX_MESSAGE_LENGTH = 280;

export interface SendMessageInput {
  channelId: string;
  content: string;
}

export interface SendMessageResult {
  success: boolean;
  message?: ChatMessage;
  error?: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
  moderationStatus?: ModerationStatus;
}

export interface GetMessagesResult {
  success: boolean;
  messages?: ChatMessage[];
  error?: string;
}

export interface DeleteMessageResult {
  success: boolean;
  error?: string;
}

export interface ReportMessageResult {
  success: boolean;
  error?: string;
}

export interface ListChannelsResult {
  success: boolean;
  channels?: ChatChannel[];
  error?: string;
}

export interface CreateChannelInput {
  channelType: ChannelType;
  partyId?: string;
  guildId?: string;
  name?: string;
}

export interface CreateChannelResult {
  success: boolean;
  channel?: ChatChannel;
  error?: string;
}

export interface GetChannelResult {
  success: boolean;
  channel?: ChatChannel;
  error?: string;
}

async function checkChatRateLimit(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  channelId: string,
  redisClient?: RedisRateLimitClient,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return { allowed: true };
  }

  const key = `chat:${tenantId}:${playerId}:${channelId}`;
  const result = await client.incrementRateLimitKey({
    key,
    timeWindowMs: 2000,
    max: 1,
    continueExceeding: false,
    exponentialBackoff: false,
  });

  if (result.current > 1) {
    return {
      allowed: false,
      retryAfterMs: result.ttl,
    };
  }

  return { allowed: true };
}

export async function sendMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  input: SendMessageInput,
  redisClient?: RedisRateLimitClient,
): Promise<SendMessageResult> {
  const chatEnabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!chatEnabled) {
    return { success: false, error: 'Chat is disabled' };
  }

  const db = getDatabaseClient(config);

  const channel = await db.query.chatChannel.findFirst({
    where: and(eq(chatChannel.channelId, input.channelId), eq(chatChannel.tenantId, tenantId)),
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  if (channel.channelType === 'party') {
    const partyChatEnabled = await evaluateFlag(config, tenantId, 'social.chat.party');
    if (!partyChatEnabled) {
      return { success: false, error: 'Party chat is disabled' };
    }
  } else if (channel.channelType === 'guild') {
    const guildChatEnabled = await evaluateFlag(config, tenantId, 'social.chat.guild');
    if (!guildChatEnabled) {
      return { success: false, error: 'Guild chat is disabled' };
    }
  } else if (channel.channelType === 'direct') {
    const directChatEnabled = await evaluateFlag(config, tenantId, 'social.chat.direct');
    if (!directChatEnabled) {
      return { success: false, error: 'Direct chat is disabled' };
    }
  }

  const content = input.content.trim();
  if (content.length === 0) {
    return { success: false, error: 'Message cannot be empty' };
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }

  const rateLimitResult = await checkChatRateLimit(
    config,
    tenantId,
    playerId,
    input.channelId,
    redisClient,
  );
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please wait before sending another message.',
      rateLimited: true,
      retryAfterMs: rateLimitResult.retryAfterMs ?? 2000,
    };
  }

  const moderationResult = await checkContent(config, tenantId, { content, context: 'chat' });

  let moderationStatus: ModerationStatus = 'approved';
  if (!moderationResult.allowed) {
    if (
      moderationResult.highestSeverity === 'block' ||
      moderationResult.highestSeverity === 'mute'
    ) {
      moderationStatus = 'rejected';
    } else {
      moderationStatus = 'flagged';
    }
  }

  if (moderationStatus === 'rejected') {
    return {
      success: false,
      error: 'Message content is not allowed',
      moderationStatus,
    };
  }

  const [message] = await db
    .insert(chatMessage)
    .values({
      channelId: input.channelId,
      senderPlayerId: playerId,
      content,
      moderationStatus,
    })
    .returning();

  if (!message) {
    return { success: false, error: 'Failed to create message' };
  }

  const wsChannel = buildChannelName('chat', input.channelId);
  const wsMessage: WSServerMessage = wsGateway.createMessage('CHAT_MESSAGE', {
    messageId: message.messageId,
    channelId: message.channelId,
    senderPlayerId: message.senderPlayerId,
    content: message.content,
    moderationStatus: message.moderationStatus,
    createdAt: message.createdAt.toISOString(),
  });
  wsGateway.broadcastToChannel(wsChannel, wsMessage);

  return {
    success: true,
    message,
    moderationStatus,
  };
}

export async function getMessages(
  config: AppConfig,
  tenantId: string,
  _playerId: string,
  channelId: string,
  limit = 50,
  cursor?: string,
): Promise<GetMessagesResult> {
  const chatEnabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!chatEnabled) {
    return { success: false, error: 'Chat is disabled' };
  }

  const db = getDatabaseClient(config);

  const channel = await db.query.chatChannel.findFirst({
    where: and(eq(chatChannel.channelId, channelId), eq(chatChannel.tenantId, tenantId)),
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  const whereConditions = [eq(chatMessage.channelId, channelId), eq(chatMessage.isDeleted, false)];

  if (cursor) {
    whereConditions.push(sql`${chatMessage.createdAt} < ${new Date(cursor)}`);
  }

  const messages = await db.query.chatMessage.findMany({
    where: and(...whereConditions),
    orderBy: [desc(chatMessage.createdAt)],
    limit,
  });

  return { success: true, messages };
}

export async function deleteMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  channelId: string,
  messageId: string,
): Promise<DeleteMessageResult> {
  const chatEnabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!chatEnabled) {
    return { success: false, error: 'Chat is disabled' };
  }

  const db = getDatabaseClient(config);

  const message = await db.query.chatMessage.findFirst({
    where: and(
      eq(chatMessage.messageId, messageId),
      eq(chatMessage.channelId, channelId),
      eq(chatMessage.senderPlayerId, playerId),
    ),
  });

  if (!message) {
    return {
      success: false,
      error: 'Message not found or you do not have permission to delete it',
    };
  }

  await db.update(chatMessage).set({ isDeleted: true }).where(eq(chatMessage.messageId, messageId));

  const wsChannel = buildChannelName('chat', channelId);
  const wsMessage: WSServerMessage = wsGateway.createMessage('CHAT_MESSAGE', {
    messageId,
    channelId,
    deleted: true,
  });
  wsGateway.broadcastToChannel(wsChannel, wsMessage);

  return { success: true };
}

export async function reportMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  channelId: string,
  messageId: string,
  reason: string,
): Promise<ReportMessageResult> {
  const chatEnabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!chatEnabled) {
    return { success: false, error: 'Chat is disabled' };
  }

  const db = getDatabaseClient(config);

  const message = await db.query.chatMessage.findFirst({
    where: and(eq(chatMessage.messageId, messageId), eq(chatMessage.channelId, channelId)),
  });

  if (!message) {
    return { success: false, error: 'Message not found' };
  }

  await db.insert(moderationReport).values({
    tenantId,
    reporterPlayerId: playerId,
    reportedPlayerId: message.senderPlayerId,
    reportType: 'content',
    contentReference: { type: 'chat_message', id: messageId },
    description: reason,
    status: 'pending',
  });

  return { success: true };
}

export async function listChannels(
  config: AppConfig,
  tenantId: string,
  _playerId: string,
): Promise<ListChannelsResult> {
  const chatEnabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!chatEnabled) {
    return { success: false, error: 'Chat is disabled' };
  }

  const db = getDatabaseClient(config);

  const channels = await db.query.chatChannel.findMany({
    where: eq(chatChannel.tenantId, tenantId),
    orderBy: [desc(chatChannel.createdAt)],
  });

  return { success: true, channels };
}

export async function getChannel(
  config: AppConfig,
  tenantId: string,
  channelId: string,
): Promise<GetChannelResult> {
  const db = getDatabaseClient(config);

  const channel = await db.query.chatChannel.findFirst({
    where: and(eq(chatChannel.channelId, channelId), eq(chatChannel.tenantId, tenantId)),
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  return { success: true, channel };
}

export async function createChannel(
  config: AppConfig,
  tenantId: string,
  input: CreateChannelInput,
): Promise<CreateChannelResult> {
  const chatEnabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!chatEnabled) {
    return { success: false, error: 'Chat is disabled' };
  }

  if (input.channelType === 'party') {
    const partyChatEnabled = await evaluateFlag(config, tenantId, 'social.chat.party');
    if (!partyChatEnabled) {
      return { success: false, error: 'Party chat is disabled' };
    }
  } else if (input.channelType === 'guild') {
    const guildChatEnabled = await evaluateFlag(config, tenantId, 'social.chat.guild');
    if (!guildChatEnabled) {
      return { success: false, error: 'Guild chat is disabled' };
    }
  } else if (input.channelType === 'direct') {
    const directChatEnabled = await evaluateFlag(config, tenantId, 'social.chat.direct');
    if (!directChatEnabled) {
      return { success: false, error: 'Direct chat is disabled' };
    }
  }

  const db = getDatabaseClient(config);

  const existingChannel = await db.query.chatChannel.findFirst({
    where: and(
      eq(chatChannel.tenantId, tenantId),
      eq(chatChannel.channelType, input.channelType),
      input.partyId ? eq(chatChannel.partyId, input.partyId) : sql`1=1`,
      input.guildId ? eq(chatChannel.guildId, input.guildId) : sql`1=1`,
    ),
  });

  if (existingChannel) {
    return { success: true, channel: existingChannel };
  }

  const [channel] = await db
    .insert(chatChannel)
    .values({
      tenantId,
      channelType: input.channelType,
      partyId: input.partyId ?? null,
      guildId: input.guildId ?? null,
      name: input.name ?? null,
    })
    .returning();

  if (!channel) {
    return { success: false, error: 'Failed to create channel' };
  }

  return { success: true, channel };
}

export async function getOrCreatePartyChannel(
  config: AppConfig,
  tenantId: string,
  partyId: string,
): Promise<CreateChannelResult> {
  return createChannel(config, tenantId, {
    channelType: 'party',
    partyId,
  });
}

export async function getOrCreateDirectChannel(
  config: AppConfig,
  tenantId: string,
  playerId1: string,
  playerId2: string,
): Promise<CreateChannelResult> {
  const channelName = [playerId1, playerId2].sort().join('-');

  return createChannel(config, tenantId, {
    channelType: 'direct',
    name: `dm-${channelName}`,
  });
}
