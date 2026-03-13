import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_BASE_URL || 'ws://localhost:3001';

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
    ws_connect: ['p(95)<50'],
  },
};

export const errorRate = new Rate('errors');
export const httpDuration = new Trend('http_duration');
export const wsLatency = new Trend('ws_latency');
export const authSuccessCounter = new Counter('auth_success');
export const sessionCreateCounter = new Counter('session_create');

export function handleSummary(data) {
  const summary = {
    'tests/load/results/summary.json': JSON.stringify(data, null, 2),
  };

  if (data.metrics.http_req_duration.values['p(95)'] > 200) {
    console.error(
      `WARNING: P95 latency ${data.metrics.http_req_duration.values['p(95)']}ms exceeds 200ms target`,
    );
  }

  return summary;
}
