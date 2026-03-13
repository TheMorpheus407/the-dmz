export { wsGateway, WebSocketGateway, buildChannelName } from './websocket.gateway.js';

export {
  handleWebSocketConnection,
  authenticateWebSocket,
  buildChannelName as buildWSChannelName,
} from './websocket.handler.js';

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
} from './websocket.types.js';
