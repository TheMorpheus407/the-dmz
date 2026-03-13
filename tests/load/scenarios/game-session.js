import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getTestUser, getUserPassword } from '../fixtures/users.js';
import * as api from '../lib/api-client.js';

export const options = {
  scenarios: {
    game_session: {
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
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const errorRate = new Rate('session_errors');
const sessionCreateDuration = new Trend('session_create_duration');
const sessionGetDuration = new Trend('session_get_duration');
const sessionCounter = new Counter('session_created');

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
  const session = api.createGameSession(accessToken);
  sessionCreateDuration.add(new Date() - startTime);

  if (session) {
    sessionCounter.add(1);

    const getStartTime = new Date();
    const sessionData = api.getGameSession(accessToken, session.id);
    sessionGetDuration.add(new Date() - getStartTime);

    check(session, {
      'session has id': (s) => s.id !== undefined,
      'session has state': (s) => s.state !== undefined,
    });
  } else {
    errorRate.add(1);
    delete sessionCache[cacheKey];
  }

  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const passed = p95 < 200;

  return {
    'tests/load/results/game-session.json': JSON.stringify(
      {
        test: 'game_session_startup',
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
      ? `✅ Game Session Test: P95 ${p95.toFixed(2)}ms < 200ms target`
      : `❌ Game Session Test: P95 ${p95.toFixed(2)}ms exceeds 200ms target`,
  };
}
