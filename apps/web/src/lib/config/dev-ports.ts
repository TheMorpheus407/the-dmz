export const DEFAULT_WEB_PORT = 5173;
export const DEFAULT_API_PORT = 3001;

const isBlank = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().length === 0;

const firstDefinedNonBlank = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    if (typeof value !== 'string' || isBlank(value)) {
      continue;
    }

    return value;
  }

  return undefined;
};

const parsePort = (value: string | undefined, fallbackPort: number, envVarName: string): number => {
  if (value === undefined || isBlank(value)) {
    return fallbackPort;
  }

  const normalized = value.trim();

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

export const resolveWebDevPorts = (
  env: NodeJS.ProcessEnv = process.env,
): {
  webPort: number;
  apiPort: number;
} => ({
  webPort: parsePort(env['WEB_PORT'], DEFAULT_WEB_PORT, 'WEB_PORT'),
  apiPort: parsePort(
    firstDefinedNonBlank(env['API_PORT'], env['PORT']),
    DEFAULT_API_PORT,
    'API_PORT',
  ),
});

export const resolveApiProxyTarget = (env: NodeJS.ProcessEnv = process.env): string => {
  const configuredTarget = env['VITE_API_URL'];
  if (typeof configuredTarget === 'string' && configuredTarget.trim().length > 0) {
    return configuredTarget.trim();
  }

  const { apiPort } = resolveWebDevPorts(env);
  return `http://localhost:${apiPort}`;
};
