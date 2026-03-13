import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Counter } from 'k6/metrics';
import { getTestUser, getUserPassword } from '../fixtures/users.js';
import * as api from '../lib/api-client.js';

export const options = {
  scenarios: {
    sustained_load: {
      executor: 'constant-vus',
      vus: 500,
      duration: '30m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const errorRate = new Rate('sustained_errors');
const operationDuration = new Trend('operation_duration');
const requestCounter = new Counter('requests_total');
const sessionCounter = new Counter('session_ops');

const sessionCache = {};

export default function () {
  const user = getTestUser(__VU);
  const cacheKey = `user-${user.email}`;

  let accessToken = sessionCache[cacheKey];

  if (!accessToken) {
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

  api.getProfile(accessToken);
  api.getEmailPool(accessToken);

  const session = api.createGameSession(accessToken);
  if (session) {
    sessionCounter.add(1);
    api.getGameSession(accessToken, session.id);
  }

  operationDuration.add(new Date() - startTime);
  requestCounter.add(1);

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const passed = p95 < 200;
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failureRate = data.metrics.http_req_failed?.values?.rate || 0;

  return {
    'tests/load/results/sustained-load.json': JSON.stringify(
      {
        test: 'sustained_load',
        duration_minutes: 30,
        concurrent_users: 500,
        p95_latency_ms: p95,
        p99_latency_ms: data.metrics.http_req_duration.values['p(99)'],
        total_requests: totalRequests,
        failure_rate: failureRate,
        target_ms: 200,
        passed,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    stdout: passed
      ? `✅ Sustained Load Test: P95 ${p95.toFixed(2)}ms < 200ms target`
      : `❌ Sustained Load Test: P95 ${p95.toFixed(2)}ms exceeds 200ms target`,
  };
}
