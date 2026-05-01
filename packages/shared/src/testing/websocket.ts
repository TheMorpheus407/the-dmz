import { vi } from 'vitest';

import { MOCK_NOW } from './mock-date.js';

type WEBSOCKET_GATEWAY_METHODS = readonly [
  'getConnectionCount',
  'getConnection',
  'getAllConnections',
  'registerConnection',
  'removeConnection',
  'isSubscribed',
  'isUnsubscribed',
  'didSendToConnection',
  'sendToUser',
  'broadcastToChannel',
  'broadcastToTenant',
  'getActiveConnections',
  'didUpdateHeartbeat',
  'getNextSequence',
  'createMessage',
  'parseChannel',
  'isValidChannel',
];

export interface MockWsGateway {
  wsGateway: Record<WEBSOCKET_GATEWAY_METHODS[number], ReturnType<typeof vi.fn>>;
  WebSocketGateway: ReturnType<typeof vi.fn>;
}

export function createMockWsGateway(): MockWsGateway {
  const wsGateway = {
    getConnectionCount: vi.fn(() => 0),
    getConnection: vi.fn(() => null),
    getAllConnections: vi.fn(function* () {}),
    registerConnection: vi.fn(() => ({
      connectionId: 'mock-connection-id',
      userId: 'mock-user-id',
      tenantId: 'mock-tenant-id',
      subscriptions: new Set<string>(),
      connectedAt: MOCK_NOW.getTime(),
      lastHeartbeat: MOCK_NOW.getTime(),
    })),
    removeConnection: vi.fn(() => {}),
    isSubscribed: vi.fn(() => true),
    isUnsubscribed: vi.fn(() => true),
    didSendToConnection: vi.fn(() => true),
    sendToUser: vi.fn(() => 0),
    broadcastToChannel: vi.fn(() => 0),
    broadcastToTenant: vi.fn(() => 0),
    getActiveConnections: vi.fn(() => []),
    didUpdateHeartbeat: vi.fn(() => true),
    getNextSequence: vi.fn(() => 1),
    createMessage: vi.fn((type: string, payload: Record<string, unknown>) => ({
      type,
      payload,
      timestamp: MOCK_NOW.getTime(),
      sequence: 1,
    })),
    parseChannel: vi.fn((channel: string) => {
      const parts = channel.split(':');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return null;
      }
      return { type: parts[0], id: parts[1] };
    }),
    isValidChannel: vi.fn((channel: string) => {
      const validTypes = [
        'session',
        'notifications',
        'threats',
        'global',
        'presence',
        'signals',
        'chat',
      ];
      const parts = channel.split(':');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return channel === 'global';
      }
      return validTypes.includes(parts[0]) && parts[1].length > 0;
    }),
  };

  const WebSocketGateway = vi.fn(function (this: typeof wsGateway) {
    return wsGateway;
  });

  return { wsGateway, WebSocketGateway };
}
