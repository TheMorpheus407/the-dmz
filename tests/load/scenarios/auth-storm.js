import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getTestUser, getUserPassword } from '../fixtures/users.js';
import * as api from '../lib/api-client.js';

export const options = {
  scenarios: {
    auth_storm: {
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

const errorRate = new Rate('auth_errors');
const loginDuration = new Trend('login_duration');
const registerDuration = new Trend('register_duration');
const loginCounter = new Counter('login_total');
const registerCounter = new Counter('register_total');

export default function () {
  const user = getTestUser(__VU);
  const isLogin = Math.random() > 0.3;

  if (isLogin) {
    const startTime = new Date();
    const result = api.loginUser(user.email, getUserPassword(user));
    loginDuration.add(new Date() - startTime);

    if (result) {
      loginCounter.add(1);
      check(result, {
        'login has tokens': (r) => r.accessToken !== undefined,
      });
    } else {
      errorRate.add(1);
    }
  } else {
    const startTime = new Date();
    const result = api.registerUser(user.email, getUserPassword(user), user.username);
    registerDuration.add(new Date() - startTime);

    if (result) {
      registerCounter.add(1);
      check(result, {
        'register has tokens': (r) => r.accessToken !== undefined,
      });
    } else {
      errorRate.add(1);
    }
  }

  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const passed = p95 < 200;

  return {
    'tests/load/results/auth-storm.json': JSON.stringify(
      {
        test: 'auth_storm',
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
      ? `✅ Auth Storm Test: P95 ${p95.toFixed(2)}ms < 200ms target`
      : `❌ Auth Storm Test: P95 ${p95.toFixed(2)}ms exceeds 200ms target`,
  };
}
