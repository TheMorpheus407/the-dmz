import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getTestUser, getUserPassword } from '../fixtures/users.js';
import * as api from '../lib/api-client.js';

export const options = {
  scenarios: {
    email_triage: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const errorRate = new Rate('triage_errors');
const triageDuration = new Trend('triage_duration');
const poolFetchDuration = new Trend('pool_fetch_duration');
const triageCounter = new Counter('triage_total');

const TRIAGE_ACTIONS = ['mark_safe', 'mark_phishing', 'quarantine', 'delete'];

const sessionCache = {};
const emailCache = {};

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

  let emailPool = emailCache[cacheKey];

  if (!emailPool || emailPool.length === 0) {
    const poolStartTime = new Date();
    emailPool = api.getEmailPool(accessToken);
    poolFetchDuration.add(new Date() - poolStartTime);

    if (!emailPool || !Array.isArray(emailPool.emails)) {
      errorRate.add(1);
      return;
    }
    emailCache[cacheKey] = emailPool.emails;
  }

  const email = emailPool[Math.floor(Math.random() * emailPool.length)];
  const action = TRIAGE_ACTIONS[Math.floor(Math.random() * TRIAGE_ACTIONS.length)];

  const startTime = new Date();
  const result = api.triageEmail(accessToken, email.id, action);
  triageDuration.add(new Date() - startTime);

  if (result) {
    triageCounter.add(1);
    check(result, {
      'triage successful': (r) => r !== undefined,
    });
  } else {
    errorRate.add(1);
  }

  sleep(Math.random() * 0.3 + 0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const passed = p95 < 200;

  return {
    'tests/load/results/email-triage.json': JSON.stringify(
      {
        test: 'email_triage_flow',
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
      ? `✅ Email Triage Test: P95 ${p95.toFixed(2)}ms < 200ms target`
      : `❌ Email Triage Test: P95 ${p95.toFixed(2)}ms exceeds 200ms target`,
  };
}
