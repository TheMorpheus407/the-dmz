export type WSMessageType =
  | 'GAME_STATE'
  | 'NOTIFICATION'
  | 'THREAT_ALERT'
  | 'SESSION_EVENT'
  | 'PLAYER_JOIN'
  | 'PLAYER_LEAVE'
  | 'PRESENCE_UPDATE'
  | 'QUICK_SIGNAL'
  | 'SUBSCRIBE'
  | 'UNSUBSCRIBE'
  | 'ACK'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  | 'ERROR';

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
  | 'signals';

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
