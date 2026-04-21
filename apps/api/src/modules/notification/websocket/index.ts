export { WebSocketGateway, buildChannelName } from './websocket.gateway.js';

export { handleWebSocketConnection, authenticateWebSocket } from './websocket.handler.js';

export {
  handleSSEConnection,
  handleSSESubscribe,
  handleSSEUnsubscribe,
  sendToSSEClient,
} from './sse.handler.js';

export type {
  WSMessageType,
  WSMessageEnvelope,
  WSClientMessage,
  WSServerMessage,
  ChannelType,
  ChannelSubscription,
  WSConnectionInfo,
  SSEClientInfo,
  JWTAuthPayload,
  WebSocketAuthResult,
  CoopEventMessage,
  CoopWSServerMessage,
  CoopWSClientMessage,
  WebSocketGatewayInterface,
} from './websocket.types.js';

export type { WebSocket as WSConnection } from 'ws';
