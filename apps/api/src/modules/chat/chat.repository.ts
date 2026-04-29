import { eq, and, desc, sql } from 'drizzle-orm';

import {
  chatChannel,
  chatMessage,
  moderationReport,
  type ChatChannel,
  type ChatMessage,
  type ChannelType,
} from '../../db/schema/social/index.js';

import type { DatabaseClient } from '../../shared/database/connection.js';

interface FindChannelParams {
  channelId: string;
  tenantId: string;
}

interface FindMessagesParams {
  channelId: string;
  tenantId: string;
  isDeleted: boolean;
  cursor?: string;
  limit?: number;
}

interface FindExistingChannelParams {
  tenantId: string;
  channelType: ChannelType;
  partyId?: string;
  guildId?: string;
}

interface CreateMessageParams {
  channelId: string;
  senderPlayerId: string;
  content: string;
  moderationStatus: string;
}

interface UpdateMessageParams {
  messageId: string;
  isDeleted: boolean;
}

interface CreateChannelParams {
  tenantId: string;
  channelType: ChannelType;
  partyId?: string;
  guildId?: string;
  name?: string;
}

interface CreateModerationReportParams {
  tenantId: string;
  reporterPlayerId: string;
  reportedPlayerId: string;
  reportType: string;
  contentReference: { type: string; id: string };
  description: string;
}

export interface ChatRepositoryInterface {
  findChannel(params: FindChannelParams): Promise<ChatChannel | undefined>;
  findChannels(tenantId: string): Promise<ChatChannel[]>;
  findExistingChannel(params: FindExistingChannelParams): Promise<ChatChannel | undefined>;
  createChannel(params: CreateChannelParams): Promise<ChatChannel | undefined>;
  findMessage(messageId: string, channelId: string): Promise<ChatMessage | undefined>;
  findMessages(params: FindMessagesParams): Promise<ChatMessage[]>;
  createMessage(params: CreateMessageParams): Promise<ChatMessage | undefined>;
  updateMessage(params: UpdateMessageParams): Promise<void>;
  createModerationReport(params: CreateModerationReportParams): Promise<void>;
}

export class ChatRepository implements ChatRepositoryInterface {
  private readonly db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.db = db;
  }

  public async findChannel(params: FindChannelParams): Promise<ChatChannel | undefined> {
    const channel = await this.db.query.chatChannel.findFirst({
      where: and(
        eq(chatChannel.channelId, params.channelId),
        eq(chatChannel.tenantId, params.tenantId),
      ),
    });
    return channel;
  }

  public async findChannels(tenantId: string): Promise<ChatChannel[]> {
    const channels = await this.db.query.chatChannel.findMany({
      where: eq(chatChannel.tenantId, tenantId),
      orderBy: [desc(chatChannel.createdAt)],
    });
    return channels;
  }

  public async findExistingChannel(
    params: FindExistingChannelParams,
  ): Promise<ChatChannel | undefined> {
    const conditions = [
      eq(chatChannel.tenantId, params.tenantId),
      eq(chatChannel.channelType, params.channelType),
    ];

    if (params.partyId) {
      conditions.push(eq(chatChannel.partyId, params.partyId));
    }
    if (params.guildId) {
      conditions.push(eq(chatChannel.guildId, params.guildId));
    }

    const channel = await this.db.query.chatChannel.findFirst({
      where: and(...conditions),
    });
    return channel;
  }

  public async createChannel(params: CreateChannelParams): Promise<ChatChannel | undefined> {
    const [channel] = await this.db
      .insert(chatChannel)
      .values({
        tenantId: params.tenantId,
        channelType: params.channelType,
        partyId: params.partyId ?? null,
        guildId: params.guildId ?? null,
        name: params.name ?? null,
      })
      .returning();
    return channel;
  }

  public async findMessage(messageId: string, channelId: string): Promise<ChatMessage | undefined> {
    const message = await this.db.query.chatMessage.findFirst({
      where: and(eq(chatMessage.messageId, messageId), eq(chatMessage.channelId, channelId)),
    });
    return message;
  }

  public async findMessages(params: FindMessagesParams): Promise<ChatMessage[]> {
    const whereConditions = [
      eq(chatMessage.channelId, params.channelId),
      eq(chatMessage.isDeleted, params.isDeleted),
    ];

    if (params.cursor) {
      whereConditions.push(sql`${chatMessage.createdAt} < ${new Date(params.cursor)}`);
    }

    const messages = await this.db.query.chatMessage.findMany({
      where: and(...whereConditions),
      orderBy: [desc(chatMessage.createdAt)],
      limit: params.limit ?? 50,
    });
    return messages;
  }

  public async createMessage(params: CreateMessageParams): Promise<ChatMessage | undefined> {
    const [message] = await this.db
      .insert(chatMessage)
      .values({
        channelId: params.channelId,
        senderPlayerId: params.senderPlayerId,
        content: params.content,
        moderationStatus: params.moderationStatus as 'approved' | 'flagged' | 'rejected',
      })
      .returning();
    return message;
  }

  public async updateMessage(params: UpdateMessageParams): Promise<void> {
    await this.db
      .update(chatMessage)
      .set({ isDeleted: params.isDeleted })
      .where(eq(chatMessage.messageId, params.messageId));
  }

  public async createModerationReport(params: CreateModerationReportParams): Promise<void> {
    await this.db.insert(moderationReport).values({
      tenantId: params.tenantId,
      reporterPlayerId: params.reporterPlayerId,
      reportedPlayerId: params.reportedPlayerId,
      reportType: params.reportType,
      contentReference: params.contentReference,
      description: params.description,
      status: 'pending',
    });
  }
}
