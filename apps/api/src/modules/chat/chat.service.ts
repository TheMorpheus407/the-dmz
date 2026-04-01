import { getDatabaseClient } from '../../shared/database/connection.js';
import { checkRateLimit } from '../social/rate-limit.service.js'; // eslint-disable-line import-x/no-restricted-paths

import { requireChatEnabled, requireChannelChatEnabled } from './chat-flags.js';
import {
  createChatMessageSentEvent,
  createChatMessageDeletedEvent,
  createChatChannelCreatedEvent,
} from './chat.events.js';
import { ChatRepository } from './chat.repository.js';
import { ChatModerationService } from './chat-moderation.service.js';

import type { RedisRateLimitClient } from '../../shared/database/redis.js';
import type {
  ChatChannel,
  ChatMessage,
  ModerationStatus,
  ChannelType,
} from '../../db/schema/social/index.js';
import type { AppConfig } from '../../config.js';
import type { IEventBus } from '../../shared/events/event-types.js';

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

export async function sendMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  input: SendMessageInput,
  redisClient?: RedisRateLimitClient,
  eventBus?: IEventBus,
): Promise<SendMessageResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = new ChatRepository(db);

  const channel = await repository.findChannel({
    channelId: input.channelId,
    tenantId,
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  const channelEnabled = await requireChannelChatEnabled(config, tenantId, channel.channelType);
  if (!channelEnabled.enabled) {
    return { success: false, error: channelEnabled.error };
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

  const rateLimitResult = await checkRateLimit(
    config,
    tenantId,
    playerId,
    'send_chat_message',
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

  const moderationService = new ChatModerationService(config, tenantId);
  const { moderationStatus } = await moderationService.moderateChat({ content });

  if (moderationStatus === 'rejected') {
    return {
      success: false,
      error: 'Message content is not allowed',
      moderationStatus,
    };
  }

  const message = await repository.createMessage({
    channelId: input.channelId,
    senderPlayerId: playerId,
    content,
    moderationStatus,
  });

  if (!message) {
    return { success: false, error: 'Failed to create message' };
  }

  if (eventBus) {
    const event = createChatMessageSentEvent(
      'chat.service',
      message.messageId,
      {
        messageId: message.messageId,
        channelId: message.channelId,
        senderPlayerId: message.senderPlayerId,
        content: message.content,
        moderationStatus: message.moderationStatus,
        createdAt: message.createdAt.toISOString(),
        tenantId,
      },
      { tenantId, userId: playerId },
    );
    eventBus.publish(event);
  }

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
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = new ChatRepository(db);

  const channel = await repository.findChannel({
    channelId,
    tenantId,
  });

  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }

  const messages = await repository.findMessages({
    channelId,
    tenantId,
    isDeleted: false,
    ...(cursor !== undefined ? { cursor } : {}),
    ...(limit !== undefined ? { limit } : {}),
  });

  return { success: true, messages };
}

export async function deleteMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  channelId: string,
  messageId: string,
  eventBus?: IEventBus,
): Promise<DeleteMessageResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = new ChatRepository(db);

  const message = await repository.findMessage(messageId, channelId);

  if (!message || message.senderPlayerId !== playerId) {
    return {
      success: false,
      error: 'Message not found or you do not have permission to delete it',
    };
  }

  await repository.updateMessage({
    messageId,
    isDeleted: true,
  });

  if (eventBus) {
    const event = createChatMessageDeletedEvent(
      'chat.service',
      messageId,
      {
        messageId,
        channelId,
      },
      { tenantId, userId: playerId },
    );
    eventBus.publish(event);
  }

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
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = new ChatRepository(db);

  const message = await repository.findMessage(messageId, channelId);

  if (!message) {
    return { success: false, error: 'Message not found' };
  }

  await repository.createModerationReport({
    tenantId,
    reporterPlayerId: playerId,
    reportedPlayerId: message.senderPlayerId,
    reportType: 'content',
    contentReference: { type: 'chat_message', id: messageId },
    description: reason,
  });

  return { success: true };
}

export async function listChannels(
  config: AppConfig,
  tenantId: string,
  _playerId: string,
): Promise<ListChannelsResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = new ChatRepository(db);

  const channels = await repository.findChannels(tenantId);

  return { success: true, channels };
}

export async function getChannel(
  config: AppConfig,
  tenantId: string,
  channelId: string,
): Promise<GetChannelResult> {
  const db = getDatabaseClient(config);
  const repository = new ChatRepository(db);

  const channel = await repository.findChannel({
    channelId,
    tenantId,
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
  eventBus?: IEventBus,
): Promise<CreateChannelResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const channelEnabled = await requireChannelChatEnabled(config, tenantId, input.channelType);
  if (!channelEnabled.enabled) {
    return { success: false, error: channelEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = new ChatRepository(db);

  const existingChannel = await repository.findExistingChannel({
    tenantId,
    channelType: input.channelType,
    ...(input.partyId !== undefined ? { partyId: input.partyId } : {}),
    ...(input.guildId !== undefined ? { guildId: input.guildId } : {}),
  });

  if (existingChannel) {
    return { success: true, channel: existingChannel };
  }

  const channel = await repository.createChannel({
    tenantId,
    channelType: input.channelType,
    ...(input.partyId !== undefined ? { partyId: input.partyId } : {}),
    ...(input.guildId !== undefined ? { guildId: input.guildId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
  });

  if (!channel) {
    return { success: false, error: 'Failed to create channel' };
  }

  if (eventBus) {
    const event = createChatChannelCreatedEvent(
      'chat.service',
      channel.channelId,
      {
        channelId: channel.channelId,
        channelType: channel.channelType,
        tenantId: channel.tenantId,
      },
      { tenantId, userId: tenantId },
    );
    eventBus.publish(event);
  }

  return { success: true, channel };
}

export async function getOrCreatePartyChannel(
  config: AppConfig,
  tenantId: string,
  partyId: string,
  eventBus?: IEventBus,
): Promise<CreateChannelResult> {
  return createChannel(
    config,
    tenantId,
    {
      channelType: 'party',
      partyId,
    },
    eventBus,
  );
}

export async function getOrCreateDirectChannel(
  config: AppConfig,
  tenantId: string,
  playerId1: string,
  playerId2: string,
  eventBus?: IEventBus,
): Promise<CreateChannelResult> {
  const channelName = [playerId1, playerId2].sort().join('-');

  return createChannel(
    config,
    tenantId,
    {
      channelType: 'direct',
      name: `dm-${channelName}`,
    },
    eventBus,
  );
}
