export const TEST_USERS = [];

const DOMAINS = ['test.com', 'example.com', 'demo.com', 'loadtest.io'];

for (let i = 1; i <= 1000; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  TEST_USERS.push({
    id: `loadtest-${i}`,
    email: `user${i}@${domain}`,
    index: i,
    username: `loaduser${i}`,
  });
}

function generateCreds(index) {
  return `Loadtest${index}_pass`;
}

export function getTestUser(index) {
  return TEST_USERS[index % TEST_USERS.length];
}

export function getUserPassword(user) {
  return generateCreds(user.index);
}

export function getRandomTestUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

export const TEST_SCENARIOS = {
  AUTH_STORM: {
    name: 'Authentication Storm',
    description: '1K users logging in simultaneously',
    concurrentUsers: 1000,
    duration: '2m',
  },
  GAME_SESSION: {
    name: 'Game Session Startup',
    description: '1K users starting game sessions',
    concurrentUsers: 1000,
    duration: '2m',
  },
  EMAIL_TRIAGE: {
    name: 'Email Triage Flow',
    description: 'Concurrent email processing actions',
    concurrentUsers: 500,
    duration: '3m',
  },
  WEBSOCKET_MSG: {
    name: 'WebSocket Messaging',
    description: 'Real-time notification delivery',
    concurrentUsers: 1000,
    duration: '2m',
  },
  MIXED_WORKLOAD: {
    name: 'Mixed Workload',
    description: 'Realistic blend of all operations',
    concurrentUsers: 1000,
    duration: '5m',
  },
  SUSTAINED_LOAD: {
    name: 'Sustained Load',
    description: '30-minute steady-state test',
    concurrentUsers: 500,
    duration: '30m',
  },
};

export const PERFORMANCE_TARGETS = {
  apiResponseTime: {
    p95: 200,
    p99: 500,
    unit: 'ms',
  },
  websocketLatency: {
    p95: 50,
    p99: 100,
    unit: 'ms',
  },
  timeToFirstByte: {
    p95: 100,
    p99: 250,
    unit: 'ms',
  },
  pageLoadTime: {
    p95: 3000,
    p99: null,
    unit: 'ms',
  },
};

export const WEIGHTED_OPERATIONS = {
  reads: 0.4,
  writes: 0.3,
  auth: 0.2,
  websocket: 0.1,
};
