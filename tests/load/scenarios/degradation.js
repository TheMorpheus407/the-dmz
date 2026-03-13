import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getTestUser, getUserPassword } from '../fixtures/users.js';
import * as api from '../lib/api-client.js';

export const options = {
  scenarios: {
    degradation_db_slow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const errorRate = new Rate('degradation_errors');
const operationDuration = new Trend('operation_duration');
const slowResponseCounter = new Counter('slow_responses');
const errorCounter = new Counter('error_responses');

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
        errorCounter.add(1);
        return;
      }
      accessToken = registerResult.accessToken;
    } else {
      accessToken = loginResult.accessToken;
    }
    sessionCache[cacheKey] = accessToken;
  }

  const startTime = new Date();

  const profile = api.getProfile(accessToken);
  const session = api.createGameSession(accessToken);
  const emails = api.getEmailPool(accessToken);

  const duration = new Date() - startTime;
  operationDuration.add(duration);

  if (duration > 500) {
    slowResponseCounter.add(1);
  }

  if (!profile || !session) {
    errorRate.add(1);
    errorCounter.add(1);
  }

  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const passed = p95 < 1000;
  const failureRate = data.metrics.http_req_failed?.values?.rate || 0;

  return {
    'tests/load/results/degradation.json': JSON.stringify(
      {
        test: 'degradation_test',
        description: 'Test behavior under degraded conditions',
        p95_latency_ms: p95,
        p99_latency_ms: data.metrics.http_req_duration.values['p(99)'],
        failure_rate: failureRate,
        target_ms: 1000,
        allowed_failure_rate: 0.05,
        passed,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    stdout:
      passed && failureRate < 0.05
        ? `✅ Degradation Test: P95 ${p95.toFixed(2)}ms, failure rate ${(failureRate * 100).toFixed(2)}%`
        : `❌ Degradation Test: P95 ${p95.toFixed(2)}ms, failure rate ${(failureRate * 100).toFixed(2)}%`,
  };
}
