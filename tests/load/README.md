# Load Testing

This directory contains k6-based load tests to validate the platform's performance under 1,000 concurrent users.

## Prerequisites

1. Install k6:

   ```bash
   # macOS
   brew install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

2. Start the required services:
   ```bash
   pnpm services:up
   pnpm dev:api
   ```

## Environment Variables

| Variable       | Default                 | Description          |
| -------------- | ----------------------- | -------------------- |
| `API_BASE_URL` | `http://localhost:3001` | Base URL for the API |
| `WS_BASE_URL`  | `ws://localhost:3001`   | WebSocket URL        |

## Running Tests

### Run All Tests (Quick)

```bash
pnpm test:load:all
```

### Run Individual Tests

```bash
# Authentication storm (1K users)
pnpm test:load:auth

# Game session startup
pnpm test:load:session

# Email triage flow
pnpm test:load:email

# WebSocket messaging
pnpm test:load:ws

# Mixed workload
pnpm test:load:mixed

# Sustained load (30 minutes)
pnpm test:load:sustained

# Degradation test
pnpm test:load:degradation
```

### Run with Custom Configuration

```bash
k6 run tests/load/scenarios/auth-storm.js \
  --vus 1000 \
  --duration 2m \
  --summary-export=results.json
```

## Performance Targets

| Metric             | P95 Target | P99 Target |
| ------------------ | ---------- | ---------- |
| API Response Time  | <200ms     | <500ms     |
| WebSocket Latency  | <50ms      | <100ms     |
| Time to First Byte | <100ms     | <250ms     |
| Page Load Time     | <3s        | N/A        |

## Test Scenarios

1. **Auth Storm**: 1K users logging in simultaneously
2. **Game Session Startup**: 1K users starting game sessions
3. **Email Triage Flow**: Concurrent email processing actions
4. **WebSocket Messaging**: Real-time notification delivery
5. **Mixed Workload**: Realistic blend of all operations (40% reads, 30% writes, 20% auth, 10% WebSocket)
6. **Sustained Load**: 30-minute steady-state test at 500 concurrent users
7. **Degradation Test**: Test behavior under degraded conditions

## CI Integration

Load tests are integrated into the CI pipeline and run:

- On merge to master (full suite)
- On PR label "run-load-tests" (quick suite: auth, session, mixed)

## Results

Test results are saved to `tests/load/results/` as JSON files.

## Troubleshooting

- If tests fail to connect, ensure the API is running on port 3001
- For WebSocket tests, ensure WebSocket support is enabled
- For sustained load tests, ensure sufficient system resources
