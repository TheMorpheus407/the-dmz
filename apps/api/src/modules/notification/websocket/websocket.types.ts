import type { WebSocket as WSConnection } from 'ws';

export type WSMessageType =
  | 'GAME_STATE'
  | 'NOTIFICATION'
  | 'THREAT_ALERT'
  | 'SESSION_EVENT'
  | 'PLAYER_JOIN'
  | 'PLAYER_LEAVE'
  | 'PRESENCE_UPDATE'
  | 'QUICK_SIGNAL'
  | 'CHAT_MESSAGE'
  | 'CHAT_TYPING'
  | 'CHAT_MODERATION_ACTION'
  | 'SUBSCRIBE'
  | 'UNSUBSCRIBE'
  | 'ACK'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'ERROR'
  | 'ACTION_SUBMIT'
  | 'ACTION_ACCEPTED'
  | 'ACTION_REJECTED'
  | 'STATE_SNAPSHOT'
  | 'EVENT'
  | 'RESYNC';

export interface WSMessageEnvelope {
  type: WSMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
  sequence: number;
}

export interface WSClientMessage {
  type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'HEARTBEAT';
  channel?: string;
  channels?: string[];
  sequence?: number;
}

export interface WSServerMessage extends WSMessageEnvelope {
  ackFor?: number;
}

export type ChannelType =
  | 'session'
  | 'notifications'
  | 'threats'
  | 'global'
  | 'presence'
  | 'signals'
  | 'chat';

export interface ChannelSubscription {
  channelType: ChannelType;
  channelId: string;
  fullChannel: string;
}

export interface WSConnectionInfo {
  connectionId: string;
  userId: string;
  tenantId: string;
  subscriptions: Set<string>;
  connectedAt: number;
  lastHeartbeat: number;
}

export interface SSEClientInfo {
  connectionId: string;
  userId: string;
  tenantId: string;
  subscriptions: Set<string>;
  connectedAt: number;
  lastEventId: number;
}

export interface JWTAuthPayload {
  userId: string;
  tenantId: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface WebSocketAuthResult {
  valid: boolean;
  payload?: JWTAuthPayload;
  error?: string;
}

export interface CoopActionSubmitMessage {
  type: 'ACTION_SUBMIT';
  action: string;
  payload: Record<string, unknown>;
  seq: number;
  requestId: string;
}

export interface CoopActionAcceptedMessage {
  type: 'ACTION_ACCEPTED';
  seq: number;
  events: Record<string, unknown>[];
  requestId: string;
}

export interface CoopActionRejectedMessage {
  type: 'ACTION_REJECTED';
  reason: 'STALE_SEQ' | 'GAP_DETECTED';
  currentSeq: number;
  requestId: string;
}

export interface CoopStateSnapshotMessage {
  type: 'STATE_SNAPSHOT';
  seq: number;
  state: Record<string, unknown>;
  timestamp: string;
}

export interface CoopEventMessage {
  type: 'EVENT';
  seq: number;
  event: Record<string, unknown>;
  timestamp: string;
}

export interface CoopResyncMessage {
  type: 'RESYNC';
  currentSeq: number;
  lastSnapshotSeq: number;
  events: Record<string, unknown>[];
}

export type CoopWSClientMessage = CoopActionSubmitMessage;

export type CoopWSServerMessage =
  | CoopActionAcceptedMessage
  | CoopActionRejectedMessage
  | CoopStateSnapshotMessage
  | CoopEventMessage
  | CoopResyncMessage;

export interface WebSocketGatewayInterface {
  registerConnection(socket: WSConnection, authPayload: JWTAuthPayload): WSConnectionInfo;
  removeConnection(connectionId: string): void;
  isSubscribed(connectionId: string, channel: string): boolean;
  isUnsubscribed(connectionId: string, channel: string): boolean;
  didSendToConnection(connectionId: string, message: WSServerMessage): boolean;
  sendToUser(userId: string, message: WSServerMessage): number;
  broadcastToChannel(channel: string, message: WSServerMessage): number;
  broadcastToTenant(tenantId: string, message: WSServerMessage): number;
  getActiveConnections(userId: string): WSConnectionInfo[];
  getConnectionCount(): number;
  getConnection(connectionId: string): WSConnectionInfo | null;
  getAllConnections(): IterableIterator<[string, WSConnectionInfo]>;
  findConnectionIdBySocket(socket: WSConnection): string | undefined;
  didUpdateHeartbeat(connectionId: string): boolean;
  getNextSequence(): number;
  createMessage(
    type: WSServerMessage['type'],
    payload: Record<string, unknown>,
    ackFor?: number,
  ): WSServerMessage;
  parseChannel(channel: string): { type: string; id: string } | null;
  isValidChannel(channel: string): boolean;
}
