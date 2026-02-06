import { type BackendEnv, parseBackendEnv } from '@the-dmz/shared';

export type AppConfig = BackendEnv;

const firstDefinedNonBlank = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    if (value.trim().length === 0) {
      continue;
    }

    return value;
  }

  return undefined;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const normalizedEnv: Record<string, string | undefined> = {
    ...env,
    PORT: firstDefinedNonBlank(env['API_PORT'], env['PORT']),
  };

  return parseBackendEnv(normalizedEnv);
}
