import { WebSocket } from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { getTestUser, getUserPassword } from '../fixtures/users.js';
import * as api from '../lib/api-client.js';

const WS_URL = __ENV.WS_BASE_URL || 'ws://localhost:3001';
const API_BASE = __ENV.API_BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    websocket_messaging: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ws_connect: ['p(95)<50', 'p(99)<100'],
    ws_msgs_received: ['count>100'],
  },
};

const errorRate = new Rate('ws_errors');
const connectDuration = new Trend('ws_connect_duration');
const messageLatency = new Trend('ws_message_latency');
const connectedGauge = new Gauge('ws_connected');
const messageCounter = new Counter('ws_messages_received');

const sessionCache = {};

function getAuthToken(user) {
  const cacheKey = `user-${user.email}`;

  if (sessionCache[cacheKey]) {
    return sessionCache[cacheKey];
  }

  const creds = getUserPassword(user);
  const loginRes = api.loginUser(user.email, creds);

  if (loginRes) {
    sessionCache[cacheKey] = loginRes.accessToken;
    return loginRes.accessToken;
  }

  const registerRes = api.registerUser(user.email, creds, user.username);

  if (registerRes) {
    sessionCache[cacheKey] = registerRes.accessToken;
    return registerRes.accessToken;
  }

  return null;
}

export default function () {
  const user = getTestUser(__VU);
  const token = getAuthToken(user);

  if (!token) {
    errorRate.add(1);
    return;
  }

  const connectStart = new Date();
  const wsUrl = `${WS_URL}/api/v1/ws?token=${token}`;

  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    connectDuration.add(new Date() - connectStart);
    connectedGauge.add(1);

    ws.send(
      JSON.stringify({
        type: 'subscribe',
        channel: 'notifications',
      }),
    );
  });

  ws.on('message', (msg) => {
    messageCounter.add(1);

    try {
      const data = JSON.parse(msg);
      if (data.timestamp) {
        const latency = new Date() - new Date(data.timestamp);
        messageLatency.add(latency);
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  ws.on('error', (err) => {
    errorRate.add(1);
    console.error(`WebSocket error: ${err}`);
  });

  ws.on('close', () => {
    connectedGauge.add(-1);
  });

  sleep(2);

  for (let i = 0; i < 5; i++) {
    ws.send(
      JSON.stringify({
        type: 'ping',
        client_time: new Date().toISOString(),
      }),
    );
    sleep(0.5);
  }

  ws.close();
  sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.ws_connect?.values?.['p(95)'] || 0;
  const passed = p95 < 50;

  return {
    'tests/load/results/websocket.json': JSON.stringify(
      {
        test: 'websocket_messaging',
        p95_connect_latency_ms: p95,
        p99_connect_latency_ms: data.metrics.ws_connect?.values?.['p(99)'] || 0,
        messages_received: data.metrics.ws_messages_received?.values?.count || 0,
        target_ms: 50,
        passed,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    stdout: passed
      ? `✅ WebSocket Test: P95 ${p95.toFixed(2)}ms < 50ms target`
      : `❌ WebSocket Test: P95 ${p95.toFixed(2)}ms exceeds 50ms target`,
  };
}
