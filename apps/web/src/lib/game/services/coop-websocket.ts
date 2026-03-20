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
      console.error('[CoopWebSocket] Failed to create WebSocket:', error);
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
      console.warn('[CoopWebSocket] Connected');
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
        console.error('[CoopWebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[CoopWebSocket] Error:', error);
      this.options.onError?.(error);
    };

    this.ws.onclose = () => {
      console.warn('[CoopWebSocket] Disconnected');
      this.stopHeartbeat();
      this.options.onDisconnect?.();

      if (!this.isIntentionallyClosed) {
        this.handleReconnect();
      }
    };
  }

  private subscribeToSession(): void {
    const sessionChannel = `coop:${this.options.sessionId}`;
    this.sendMessage({
      type: 'SUBSCRIBE',
      channels: [sessionChannel, 'coop:events'],
    });
    this.subscribedChannels.add(sessionChannel);
    this.subscribedChannels.add('coop:events');
  }

  private sendMessage(message: {
    type: string;
    channel?: string;
    channels?: string[];
    sequence?: number;
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[CoopWebSocket] Cannot send message, WebSocket not connected');
      return;
    }

    const outgoingMessage = {
      ...message,
      sequence: this.sequenceNumber++,
    };

    try {
      this.ws.send(JSON.stringify(outgoingMessage));
    } catch (error) {
      console.error('[CoopWebSocket] Failed to send message:', error);
    }
  }

  private handleMessage(message: CoopWebSocketMessage): void {
    if (message.type === 'SESSION_EVENT' || message.type === 'coop.session.created') {
      const payload = message.payload as { eventType?: string; payload?: Record<string, unknown> };
      this.options.onEvent({
        type: payload['eventType'] as string,
        payload: (payload['payload'] as Record<string, unknown>) ?? {},
      });
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
      console.error('[CoopWebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.warn(
      `[CoopWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  sendQuickSignal(_signal: string): void {
    this.sendMessage({
      type: 'QUICK_SIGNAL',
      channel: `coop:${this.options.sessionId}`,
      sequence: this.sequenceNumber++,
    });

    this.sendMessage({
      type: 'SESSION_EVENT',
      channel: `coop:${this.options.sessionId}`,
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
