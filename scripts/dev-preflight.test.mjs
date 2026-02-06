import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';

import {
  DEFAULT_API_PORT,
  DEFAULT_WEB_PORT,
  assertDockerServicesRunning,
  assertPortsAvailable,
  isPortAvailable,
  resolveDevPorts,
  runDevPreflight,
} from './dev-preflight.mjs';

test('resolveDevPorts uses defaults when env vars are missing', () => {
  const ports = resolveDevPorts({});

  assert.deepEqual(ports, {
    webPort: DEFAULT_WEB_PORT,
    apiPort: DEFAULT_API_PORT,
  });
});

test('resolveDevPorts honors WEB_PORT and API_PORT', () => {
  const ports = resolveDevPorts({
    WEB_PORT: '5174',
    API_PORT: '3001',
  });

  assert.deepEqual(ports, {
    webPort: 5174,
    apiPort: 3001,
  });
});

test('resolveDevPorts falls back to PORT when API_PORT is missing', () => {
  const ports = resolveDevPorts({
    WEB_PORT: '5173',
    PORT: '3200',
  });

  assert.deepEqual(ports, {
    webPort: 5173,
    apiPort: 3200,
  });
});

test('resolveDevPorts falls back to PORT when API_PORT is blank', () => {
  const ports = resolveDevPorts({
    WEB_PORT: '5173',
    API_PORT: '',
    PORT: '3200',
  });

  assert.deepEqual(ports, {
    webPort: 5173,
    apiPort: 3200,
  });
});

test('resolveDevPorts prefers API_PORT when both API_PORT and PORT are provided', () => {
  const ports = resolveDevPorts({
    WEB_PORT: '5173',
    API_PORT: '3010',
    PORT: '3200',
  });

  assert.deepEqual(ports, {
    webPort: 5173,
    apiPort: 3010,
  });
});

test('resolveDevPorts rejects invalid port values', () => {
  assert.throws(
    () =>
      resolveDevPorts({
        WEB_PORT: 'abc',
      }),
    /Invalid WEB_PORT value/,
  );
});

test('resolveDevPorts rejects malformed numeric WEB_PORT values', () => {
  assert.throws(
    () =>
      resolveDevPorts({
        WEB_PORT: '5173abc',
      }),
    /Invalid WEB_PORT value/,
  );
});

test('resolveDevPorts rejects malformed numeric API_PORT values', () => {
  assert.throws(
    () =>
      resolveDevPorts({
        API_PORT: '3000abc',
        PORT: '3200',
      }),
    /Invalid API_PORT value/,
  );
});

test('assertDockerServicesRunning throws when required services are missing', () => {
  assert.throws(
    () => assertDockerServicesRunning(new Set(['postgres'])),
    /Run `docker compose up -d` first/,
  );
});

test('isPortAvailable reports false when a port is already bound', async () => {
  const server = net.createServer();

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get ephemeral port for test');
  }

  const inUse = await isPortAvailable(address.port);
  assert.equal(inUse, false);

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const released = await isPortAvailable(address.port);
  assert.equal(released, true);
});

test('assertPortsAvailable reports conflict details', async () => {
  await assert.rejects(
    () =>
      assertPortsAvailable(
        [
          { name: 'WEB_PORT', port: 5173 },
          { name: 'API_PORT', port: 3000 },
        ],
        async (port) => port !== 3000,
      ),
    /API_PORT port 3000 is already in use/,
  );
});

test('assertPortsAvailable rejects duplicate configured ports', async () => {
  await assert.rejects(
    () =>
      assertPortsAvailable(
        [
          { name: 'WEB_PORT', port: 3000 },
          { name: 'API_PORT', port: 3000 },
        ],
        async () => true,
      ),
    /WEB_PORT and API_PORT both resolve to port 3000/,
  );
});

test('runDevPreflight runs all checks and returns resolved ports', async () => {
  const capturedLogs = [];

  const result = await runDevPreflight({
    env: {
      WEB_PORT: '5176',
      API_PORT: '3010',
    },
    listServices: () => new Set(['postgres', 'redis']),
    checkPort: async () => true,
    log: (line) => capturedLogs.push(line),
  });

  assert.deepEqual(result, { webPort: 5176, apiPort: 3010 });
  assert.equal(capturedLogs.length, 1);
  assert.match(capturedLogs[0], /Dev preflight checks passed/);
});

test('runDevPreflight falls back to PORT when API_PORT is blank', async () => {
  const result = await runDevPreflight({
    env: {
      WEB_PORT: '5176',
      API_PORT: '',
      PORT: '3010',
    },
    listServices: () => new Set(['postgres', 'redis']),
    checkPort: async () => true,
  });

  assert.deepEqual(result, { webPort: 5176, apiPort: 3010 });
});

test('runDevPreflight surfaces Docker guidance when services are down', async () => {
  await assert.rejects(
    () =>
      runDevPreflight({
        env: {},
        listServices: () => new Set(),
        checkPort: async () => true,
      }),
    /Run `docker compose up -d` first/,
  );
});

test('runDevPreflight rejects duplicate WEB_PORT and API_PORT values', async () => {
  await assert.rejects(
    () =>
      runDevPreflight({
        env: {
          WEB_PORT: '3000',
          API_PORT: '3000',
        },
        listServices: () => new Set(['postgres', 'redis']),
        checkPort: async () => true,
      }),
    /WEB_PORT and API_PORT both resolve to port 3000/,
  );
});
