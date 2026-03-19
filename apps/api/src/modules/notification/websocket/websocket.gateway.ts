/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { generateId } from '../../../shared/utils/id.js';
import {
  recordWebSocketConnection,
  recordWebSocketMessage,
} from '../../../shared/metrics/hooks.js';

import type { WebSocket } from '@fastify/websocket';
import type { JWTAuthPayload, WSConnectionInfo, WSServerMessage } from './websocket.types.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 60_000;

interface WebSocketConnection {
  socket: WebSocket;
  connectionInfo: WSConnectionInfo;
  heartbeatTimer: NodeJS.Timeout | null;
}

export class WebSocketGateway {
  private connections = new Map<string, WebSocketConnection>();
  private userConnections = new Map<string, Set<string>>();
  private channelSubscriptions = new Map<string, Set<string>>();
  private sequenceNumber = 0;

  public registerConnection(socket: WebSocket, authPayload: JWTAuthPayload): WSConnectionInfo {
    const connectionId = generateId();
    const now = Date.now();

    const connectionInfo: WSConnectionInfo = {
      connectionId,
      userId: authPayload.userId,
      tenantId: authPayload.tenantId,
      subscriptions: new Set(),
      connectedAt: now,
      lastHeartbeat: now,
    };

    const wsConnection: WebSocketConnection = {
      socket,
      connectionInfo,
      heartbeatTimer: null,
    };

    this.connections.set(connectionId, wsConnection);

    const userConnSet = this.userConnections.get(authPayload.userId) ?? new Set();
    userConnSet.add(connectionId);
    this.userConnections.set(authPayload.userId, userConnSet);

    this.startHeartbeat(wsConnection);

    recordWebSocketConnection('connect', authPayload.tenantId);

    return connectionInfo;
  }

  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    if (connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
    }

    const { userId, subscriptions, tenantId } = connection.connectionInfo;

    for (const channel of subscriptions) {
      this.removeChannelSubscription(channel, connectionId);
    }

    const userConnSet = this.userConnections.get(userId);
    if (userConnSet) {
      userConnSet.delete(connectionId);
      if (userConnSet.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    this.connections.delete(connectionId);

    recordWebSocketConnection('disconnect', tenantId);
  }

  public subscribe(connectionId: string, channel: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.connectionInfo.subscriptions.add(channel);

    const connSet = this.channelSubscriptions.get(channel) ?? new Set();
    connSet.add(connectionId);
    this.channelSubscriptions.set(channel, connSet);

    return true;
  }

  public unsubscribe(connectionId: string, channel: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.connectionInfo.subscriptions.delete(channel);
    this.removeChannelSubscription(channel, connectionId);

    return true;
  }

  public sendToConnection(connectionId: string, message: WSServerMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const payload = JSON.stringify(message);
      connection.socket.send(payload);
      recordWebSocketMessage('sent', connection.connectionInfo.tenantId);
      return true;
    } catch {
      return false;
    }
  }

  public sendToUser(userId: string, message: WSServerMessage): number {
    const connIds = this.userConnections.get(userId);
    if (!connIds) {
      return 0;
    }

    let sentCount = 0;
    for (const connId of connIds) {
      if (this.sendToConnection(connId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  public broadcastToChannel(channel: string, message: WSServerMessage): number {
    const connIds = this.channelSubscriptions.get(channel);
    if (!connIds) {
      return 0;
    }

    let sentCount = 0;
    for (const connId of connIds) {
      if (this.sendToConnection(connId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  public broadcastToTenant(tenantId: string, message: WSServerMessage): number {
    let sentCount = 0;
    for (const [connId, connection] of this.connections) {
      if (
        connection.connectionInfo.tenantId === tenantId &&
        connection.socket.readyState === WebSocket.OPEN
      ) {
        if (this.sendToConnection(connId, message)) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  public getActiveConnections(userId: string): WSConnectionInfo[] {
    const connIds = this.userConnections.get(userId);
    if (!connIds) {
      return [];
    }

    const result: WSConnectionInfo[] = [];
    for (const connId of connIds) {
      const connection = this.connections.get(connId);
      if (connection) {
        result.push({ ...connection.connectionInfo });
      }
    }

    return result;
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getConnection(connectionId: string): WSConnectionInfo | null {
    const connection = this.connections.get(connectionId);
    return connection ? { ...connection.connectionInfo } : null;
  }

  public updateHeartbeat(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.connectionInfo.lastHeartbeat = Date.now();
    return true;
  }

  public getNextSequence(): number {
    return ++this.sequenceNumber;
  }

  public createMessage(
    type: WSServerMessage['type'],
    payload: Record<string, unknown>,
    ackFor?: number,
  ): WSServerMessage {
    return {
      type,
      payload,
      timestamp: Date.now(),
      sequence: this.getNextSequence(),
      ...(ackFor !== undefined && { ackFor }),
    };
  }

  private removeChannelSubscription(channel: string, connectionId: string): void {
    const connSet = this.channelSubscriptions.get(channel);
    if (connSet) {
      connSet.delete(connectionId);
      if (connSet.size === 0) {
        this.channelSubscriptions.delete(channel);
      }
    }
  }

  private startHeartbeat(connection: WebSocketConnection): void {
    const timer = setInterval(() => {
      this.checkHeartbeat(connection);
    }, HEARTBEAT_INTERVAL_MS);

    connection.heartbeatTimer = timer;
    timer.unref();
  }

  private checkHeartbeat(connection: WebSocketConnection): void {
    const now = Date.now();
    const lastHeartbeat = connection.connectionInfo.lastHeartbeat;

    if (now - lastHeartbeat > CONNECTION_TIMEOUT_MS) {
      connection.socket.close(4001, 'Heartbeat timeout');
      this.removeConnection(connection.connectionInfo.connectionId);
    } else {
      const heartbeatMsg = this.createMessage('HEARTBEAT', { ping: now });
      try {
        connection.socket.send(JSON.stringify(heartbeatMsg));
      } catch {
        this.removeConnection(connection.connectionInfo.connectionId);
      }
    }
  }

  public parseChannel(channel: string): { type: string; id: string } | null {
    const parts = channel.split(':');
    if (parts.length !== 2) {
      return null;
    }

    if (!parts[0] || !parts[1]) {
      return null;
    }

    return { type: parts[0], id: parts[1] };
  }

  public isValidChannel(channel: string): boolean {
    const validTypes = ['session', 'notifications', 'threats', 'global', 'presence', 'signals'];
    const parsed = this.parseChannel(channel);

    if (!parsed) {
      return channel === 'global';
    }

    return validTypes.includes(parsed.type) && parsed.id.length > 0;
  }
}

export const wsGateway = new WebSocketGateway();

export function buildChannelName(type: string, id: string): string {
  return `${type}:${id}`;
}
