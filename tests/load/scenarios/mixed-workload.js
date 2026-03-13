import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getTestUser, getUserPassword, WEIGHTED_OPERATIONS } from '../fixtures/users.js';
import * as api from '../lib/api-client.js';

export const options = {
  scenarios: {
    mixed_workload: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const errorRate = new Rate('mixed_errors');
const operationDuration = new Trend('operation_duration');
const readCounter = new Counter('ops_read');
const writeCounter = new Counter('ops_write');
const authCounter = new Counter('ops_auth');

const sessionCache = {};

export default function () {
  const user = getTestUser(__VU);
  const cacheKey = `user-${user.email}`;

  let accessToken = sessionCache[cacheKey];

  const rand = Math.random();
  let operation;

  if (rand < WEIGHTED_OPERATIONS.auth) {
    operation = 'auth';
  } else if (rand < WEIGHTED_OPERATIONS.auth + WEIGHTED_OPERATIONS.reads) {
    operation = 'read';
  } else if (
    rand <
    WEIGHTED_OPERATIONS.auth + WEIGHTED_OPERATIONS.reads + WEIGHTED_OPERATIONS.writes
  ) {
    operation = 'write';
  } else {
    operation = 'websocket';
  }

  if (!accessToken && operation !== 'auth') {
    const loginResult = api.loginUser(user.email, getUserPassword(user));
    if (!loginResult) {
      const registerResult = api.registerUser(user.email, getUserPassword(user), user.username);
      if (!registerResult) {
        errorRate.add(1);
        return;
      }
      accessToken = registerResult.accessToken;
    } else {
      accessToken = loginResult.accessToken;
    }
    sessionCache[cacheKey] = accessToken;
  }

  const startTime = new Date();

  switch (operation) {
    case 'auth':
      api.loginUser(user.email, user.password);
      authCounter.add(1);
      break;

    case 'read':
      if (accessToken) {
        api.getProfile(accessToken);
        api.getEmailPool(accessToken);
      }
      readCounter.add(1);
      break;

    case 'write':
      if (accessToken) {
        const session = api.createGameSession(accessToken);
        if (session) {
          api.performGameAction(accessToken, session.id, 'sync_state', {});
        }
      }
      writeCounter.add(1);
      break;

    case 'websocket':
      break;
  }

  operationDuration.add(new Date() - startTime);

  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const passed = p95 < 200;

  return {
    'tests/load/results/mixed-workload.json': JSON.stringify(
      {
        test: 'mixed_workload',
        p95_latency_ms: p95,
        p99_latency_ms: data.metrics.http_req_duration.values['p(99)'],
        target_ms: 200,
        passed,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    stdout: passed
      ? `✅ Mixed Workload Test: P95 ${p95.toFixed(2)}ms < 200ms target`
      : `❌ Mixed Workload Test: P95 ${p95.toFixed(2)}ms exceeds 200ms target`,
  };
}
