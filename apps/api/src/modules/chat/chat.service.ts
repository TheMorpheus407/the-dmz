import { getDatabaseClient } from '../../shared/database/connection.js';
import { checkRateLimit } from '../social/index.js';
import {
  moderationStatuses,
  type ModerationStatus,
  type ChatChannel,
  type ChatMessage,
  type ChannelType,
} from '../../db/schema/social/index.js';

import { requireChatEnabled, requireChannelChatEnabled } from './chat-flags.js';
import {
  createChatMessageSentEvent,
  createChatMessageDeletedEvent,
  createChatChannelCreatedEvent,
} from './chat.events.js';
import { ChatRepository, type ChatRepositoryInterface } from './chat.repository.js';
import { ChatModerationService } from './chat.moderation.service.js';

import type { RedisRateLimitClient } from '../../shared/database/redis.js';
import type { AppConfig } from '../../config.js';
import type { EventBus } from '../../shared/events/event-types.js';

const MAX_MESSAGE_LENGTH = 280;

function validateMessageContent(
  content: string,
): { valid: true } | { valid: false; error: string } {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }
  return { valid: true };
}

/* eslint-disable max-params, @typescript-eslint/max-params */
async function checkMessageRateLimit(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  redisClient: RedisRateLimitClient | undefined,
  rateLimiter: typeof checkRateLimit,
): Promise<
  { allowed: true } | { allowed: false; error: string; rateLimited: true; retryAfterMs: number }
> {
  const rateLimitResult = await rateLimiter(
    config,
    tenantId,
    playerId,
    'send_chat_message',
    redisClient,
  );
  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      error: 'Rate limit exceeded. Please wait before sending another message.',
      rateLimited: true,
      retryAfterMs: rateLimitResult.retryAfterMs ?? 2000,
    };
  }
  return { allowed: true };
}

export interface ChatServiceDependencies {
  repository?: ChatRepositoryInterface;
  rateLimiter?: typeof checkRateLimit;
  moderationService?: ChatModerationService;
}

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

/* eslint-disable max-params, @typescript-eslint/max-params, max-statements */
export async function sendMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  input: SendMessageInput,
  redisClient?: RedisRateLimitClient,
  eventBus?: EventBus,
  dependencies?: ChatServiceDependencies,
): Promise<SendMessageResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = dependencies?.repository ?? new ChatRepository(db);

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

  const contentValidation = validateMessageContent(input.content);
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }
  const content = input.content.trim();

  const rateLimiter = dependencies?.rateLimiter ?? checkRateLimit;
  const rateLimitCheck = await checkMessageRateLimit(
    config,
    tenantId,
    playerId,
    redisClient,
    rateLimiter,
  );
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: rateLimitCheck.error,
      rateLimited: true,
      retryAfterMs: rateLimitCheck.retryAfterMs,
    };
  }

  const moderationService =
    dependencies?.moderationService ?? new ChatModerationService(config, tenantId);
  const { moderationStatus } = await moderationService.moderateChat({ content });

  if (moderationStatus === moderationStatuses[2]) {
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

/* eslint-disable max-params, @typescript-eslint/max-params */
export async function getMessages(
  config: AppConfig,
  tenantId: string,
  _playerId: string,
  channelId: string,
  limit = 50,
  cursor?: string,
  dependencies?: ChatServiceDependencies,
): Promise<GetMessagesResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = dependencies?.repository ?? new ChatRepository(db);

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

/* eslint-disable max-params, @typescript-eslint/max-params */
export async function deleteMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  channelId: string,
  messageId: string,
  eventBus?: EventBus,
  dependencies?: ChatServiceDependencies,
): Promise<DeleteMessageResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = dependencies?.repository ?? new ChatRepository(db);

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

/* eslint-disable max-params, @typescript-eslint/max-params */
export async function reportMessage(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  channelId: string,
  messageId: string,
  reason: string,
  dependencies?: ChatServiceDependencies,
): Promise<ReportMessageResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = dependencies?.repository ?? new ChatRepository(db);

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
  dependencies?: ChatServiceDependencies,
): Promise<ListChannelsResult> {
  const chatEnabled = await requireChatEnabled(config, tenantId);
  if (!chatEnabled.enabled) {
    return { success: false, error: chatEnabled.error };
  }

  const db = getDatabaseClient(config);
  const repository = dependencies?.repository ?? new ChatRepository(db);

  const channels = await repository.findChannels(tenantId);

  return { success: true, channels };
}

export async function getChannel(
  config: AppConfig,
  tenantId: string,
  channelId: string,
  dependencies?: ChatServiceDependencies,
): Promise<GetChannelResult> {
  const db = getDatabaseClient(config);
  const repository = dependencies?.repository ?? new ChatRepository(db);

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
  eventBus?: EventBus,
  dependencies?: ChatServiceDependencies,
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
  const repository = dependencies?.repository ?? new ChatRepository(db);

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
  eventBus?: EventBus,
  dependencies?: ChatServiceDependencies,
): Promise<CreateChannelResult> {
  return createChannel(
    config,
    tenantId,
    {
      channelType: 'party',
      partyId,
    },
    eventBus,
    dependencies,
  );
}

/* eslint-disable max-params, @typescript-eslint/max-params */
export async function getOrCreateDirectChannel(
  config: AppConfig,
  tenantId: string,
  playerId1: string,
  playerId2: string,
  eventBus?: EventBus,
  dependencies?: ChatServiceDependencies,
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
    dependencies,
  );
}
