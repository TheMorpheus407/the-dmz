import { execFileSync } from 'node:child_process';
import net from 'node:net';
import { pathToFileURL } from 'node:url';

export const DEFAULT_WEB_PORT = 5173;
export const DEFAULT_API_PORT = 3000;
export const REQUIRED_DOCKER_SERVICES = ['postgres', 'redis'];

const isBlank = (value) => typeof value === 'string' && value.trim() === '';

const firstDefinedNonBlank = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || isBlank(value)) {
      continue;
    }

    return value;
  }

  return undefined;
};

export const parsePort = (value, fallbackPort, envVarName) => {
  if (value === undefined || value === null || isBlank(value)) {
    return fallbackPort;
  }

  const normalized = String(value).trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      `Invalid ${envVarName} value "${value}". Expected an integer between 1 and 65535.`,
    );
  }

  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid ${envVarName} value "${value}". Expected an integer between 1 and 65535.`,
    );
  }

  return parsed;
};

export const resolveDevPorts = (env = process.env) => ({
  webPort: parsePort(env.WEB_PORT, DEFAULT_WEB_PORT, 'WEB_PORT'),
  apiPort: parsePort(
    firstDefinedNonBlank(env.API_PORT, env.PORT),
    DEFAULT_API_PORT,
    'API_PORT',
  ),
});

export const isPortAvailable = (port, host = '127.0.0.1') =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();

    server.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error) {
        const code = String(error.code);
        if (code === 'EADDRINUSE' || code === 'EACCES') {
          resolve(false);
          return;
        }
      }

      reject(error);
    });

    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });

export const getRunningDockerServices = (runCommand = execFileSync) => {
  try {
    const output = runCommand(
      'docker',
      ['compose', 'ps', '--services', '--filter', 'status=running'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    return new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error
        ? String(error.stderr ?? '').trim()
        : '';
    const detail = stderr.length > 0 ? ` ${stderr}` : '';

    throw new Error(
      `Unable to verify Docker services (postgres, redis).${detail} Run \`docker compose up -d\` first.`,
    );
  }
};

export const assertDockerServicesRunning = (
  runningServices,
  requiredServices = REQUIRED_DOCKER_SERVICES,
) => {
  const missing = requiredServices.filter((service) => !runningServices.has(service));

  if (missing.length > 0) {
    throw new Error(
      `Docker services not running: ${missing.join(', ')}. Run \`docker compose up -d\` first.`,
    );
  }
};

export const assertPortsAvailable = async (ports, checkPort = isPortAvailable) => {
  const portsByNumber = new Map();
  for (const { name, port } of ports) {
    const assignments = portsByNumber.get(port) ?? [];
    assignments.push(name);
    portsByNumber.set(port, assignments);
  }

  const duplicateAssignments = Array.from(portsByNumber.entries())
    .filter(([, names]) => names.length > 1)
    .map(([port, names]) => `${names.join(' and ')} both resolve to port ${port}.`);

  if (duplicateAssignments.length > 0) {
    const details = duplicateAssignments.join(' ');
    throw new Error(`${details} Set WEB_PORT/API_PORT to different open ports and retry.`);
  }

  const conflicts = [];

  for (const { name, port } of ports) {
    const available = await checkPort(port);
    if (!available) {
      conflicts.push({ name, port });
    }
  }

  if (conflicts.length > 0) {
    const details = conflicts
      .map(({ name, port }) => `${name} port ${port} is already in use.`)
      .join(' ');

    throw new Error(`${details} Set WEB_PORT/API_PORT to open ports and retry.`);
  }
};

export const runDevPreflight = async ({
  env = process.env,
  listServices = getRunningDockerServices,
  checkPort = isPortAvailable,
  log = console.log,
} = {}) => {
  const { webPort, apiPort } = resolveDevPorts(env);
  const runningServices = listServices();

  assertDockerServicesRunning(runningServices);
  await assertPortsAvailable(
    [
      { name: 'WEB_PORT', port: webPort },
      { name: 'API_PORT', port: apiPort },
    ],
    checkPort,
  );

  log(`Dev preflight checks passed (WEB_PORT=${webPort}, API_PORT=${apiPort}).`);
  return { webPort, apiPort };
};

const isMainModule = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMainModule) {
  try {
    await runDevPreflight();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Dev preflight failed: ${message}`);
    process.exitCode = 1;
  }
}
