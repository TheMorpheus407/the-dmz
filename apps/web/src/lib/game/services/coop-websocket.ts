import { logger } from '$lib/logger';

import { browser } from '$app/environment';

export type CoopWebSocketMessage = {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  sequence: number;
  ackFor?: number;
};

export type CoopEventHandler = (payload: Record<string, unknown>) => void;

interface CoopWebSocketOptions {
  sessionId: string;
  userId: string;
  onEvent: (event: { type: string; payload: Record<string, unknown> }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onResync?: (currentSeq: number) => void;
  onActionRejected?: (reason: 'STALE_SEQ' | 'GAP_DETECTED', currentSeq: number) => void;
}

export class CoopWebSocketClient {
  private ws: WebSocket | null = null;
  private options: CoopWebSocketOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sequenceNumber = 0;
  private subscribedChannels: Set<string> = new Set();
  private pendingMessages: Map<number, () => void> = new Map();
  private isIntentionallyClosed = false;
  private currentSeq = 0;
  private lastSyncedSeq = 0;

  constructor(options: CoopWebSocketOptions) {
    this.options = options;
  }

  connect(): void {
    if (!browser) return;

    this.isIntentionallyClosed = false;
    const wsUrl = this.buildWebSocketUrl();

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      logger.error('[CoopWebSocket] Failed to create WebSocket:', { error });
      this.handleReconnect();
    }
  }

  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/v1/coop`;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      logger.debug('[CoopWebSocket] Connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.subscribeToSession();
      this.options.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as CoopWebSocketMessage;
        this.handleMessage(message);
      } catch (error) {
        logger.error('[CoopWebSocket] Failed to parse message:', { error });
      }
    };

    this.ws.onerror = (error) => {
      logger.error('[CoopWebSocket] Error:', { error });
      this.options.onError?.(error);
    };

    this.ws.onclose = () => {
      logger.debug('[CoopWebSocket] Disconnected');
      this.stopHeartbeat();
      this.options.onDisconnect?.();

      if (!this.isIntentionallyClosed) {
        this.handleReconnect();
      }
    };
  }

  private subscribeToSession(): void {
    const stateChannel = `session.state:${this.options.sessionId}`;
    const eventsChannel = `session.events:${this.options.sessionId}`;
    const arbitrationChannel = `session.arbitration:${this.options.sessionId}`;
    const presenceChannel = `session.presence:${this.options.sessionId}`;

    this.sendMessage({
      type: 'SUBSCRIBE',
      channels: [stateChannel, eventsChannel, arbitrationChannel, presenceChannel],
    });

    this.subscribedChannels.add(stateChannel);
    this.subscribedChannels.add(eventsChannel);
    this.subscribedChannels.add(arbitrationChannel);
    this.subscribedChannels.add(presenceChannel);
  }

  private sendMessage(message: {
    type: string;
    channel?: string;
    channels?: string[];
    sequence?: number;
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('[CoopWebSocket] Cannot send message, WebSocket not connected');
      return;
    }

    const outgoingMessage = {
      ...message,
      sequence: this.sequenceNumber++,
    };

    try {
      this.ws.send(JSON.stringify(outgoingMessage));
    } catch (error) {
      logger.error('[CoopWebSocket] Failed to send message:', { error });
    }
  }

  private handleMessage(message: CoopWebSocketMessage): void {
    if (message.type === 'SESSION_EVENT' || message.type === 'coop.session.created') {
      const payload = message.payload as { eventType?: string; payload?: Record<string, unknown> };
      this.options.onEvent({
        type: payload['eventType'] as string,
        payload: (payload['payload'] as Record<string, unknown>) ?? {},
      });
    } else if (message.type === 'ACTION_ACCEPTED') {
      const payload = message.payload as { seq?: number; requestId?: string };
      if (payload.seq !== undefined) {
        this.currentSeq = payload.seq;
        this.lastSyncedSeq = payload.seq;
      }
      const resolve = this.pendingMessages.get(message.sequence);
      if (resolve) {
        resolve();
        this.pendingMessages.delete(message.sequence);
      }
    } else if (message.type === 'ACTION_REJECTED') {
      const payload = message.payload as {
        reason?: 'STALE_SEQ' | 'GAP_DETECTED';
        currentSeq?: number;
        requestId?: string;
      };
      if (payload.reason && payload.currentSeq !== undefined) {
        this.currentSeq = payload.currentSeq;
        this.options.onActionRejected?.(payload.reason, payload.currentSeq);
      }
    } else if (message.type === 'EVENT') {
      const payload = message.payload as { seq?: number; event?: Record<string, unknown> };
      if (payload.seq !== undefined) {
        this.currentSeq = payload.seq;
      }
      if (payload.event) {
        this.options.onEvent({
          type: (payload.event as { eventType?: string })['eventType'] as string,
          payload: payload.event,
        });
      }
    } else if (message.type === 'STATE_SNAPSHOT') {
      const payload = message.payload as { seq?: number; state?: Record<string, unknown> };
      if (payload.seq !== undefined) {
        this.currentSeq = payload.seq;
        this.lastSyncedSeq = payload.seq;
      }
      this.options.onResync?.(this.currentSeq);
    } else if (message.type === 'RESYNC') {
      const payload = message.payload as { currentSeq?: number };
      if (payload.currentSeq !== undefined) {
        this.currentSeq = payload.currentSeq;
        this.options.onResync?.(payload.currentSeq);
      }
    } else if (message.type === 'ACK' && message.ackFor !== undefined) {
      const resolve = this.pendingMessages.get(message.ackFor);
      if (resolve) {
        resolve();
        this.pendingMessages.delete(message.ackFor);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage({ type: 'HEARTBEAT' });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[CoopWebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.warn(
      `[CoopWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  sendAction(
    action: string,
    actionPayload: Record<string, unknown>,
    sessionId: string,
    tenantId: string,
    playerId: string,
  ): Promise<{ accepted: boolean; reason?: string }> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ accepted: false, reason: 'Not connected' });
        return;
      }

      const requestId = crypto.randomUUID();
      const seq = this.currentSeq;

      const message = {
        type: 'ACTION_SUBMIT',
        action,
        payload: {
          sessionId,
          tenantId,
          playerId,
          actionPayload,
        },
        seq,
        requestId,
      };

      const seqForPending = this.sequenceNumber++;
      this.pendingMessages.set(seqForPending, () => {
        resolve({ accepted: true });
      });

      this.ws.send(JSON.stringify(message));

      setTimeout(() => {
        if (this.pendingMessages.has(seqForPending)) {
          this.pendingMessages.delete(seqForPending);
          resolve({ accepted: false, reason: 'Timeout' });
        }
      }, 5000);
    });
  }

  sendQuickSignal(_signal: string): void {
    this.sendMessage({
      type: 'QUICK_SIGNAL',
      channel: `session.signals:${this.options.sessionId}`,
      sequence: this.sequenceNumber++,
    });

    this.sendMessage({
      type: 'SESSION_EVENT',
      channel: `session.events:${this.options.sessionId}`,
      sequence: this.sequenceNumber++,
    });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getCurrentSeq(): number {
    return this.currentSeq;
  }

  getLastSyncedSeq(): number {
    return this.lastSyncedSeq;
  }
}

let globalCoopWsClient: CoopWebSocketClient | null = null;

export function getCoopWebSocketClient(): CoopWebSocketClient | null {
  return globalCoopWsClient;
}

export function createCoopWebSocketClient(options: CoopWebSocketOptions): CoopWebSocketClient {
  if (globalCoopWsClient) {
    globalCoopWsClient.disconnect();
  }

  globalCoopWsClient = new CoopWebSocketClient(options);
  return globalCoopWsClient;
}

export function destroyCoopWebSocketClient(): void {
  if (globalCoopWsClient) {
    globalCoopWsClient.disconnect();
    globalCoopWsClient = null;
  }
}
