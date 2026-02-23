import { type BackendEnv, parseBackendEnv, validateBackendEnvConsistency } from '@the-dmz/shared';

export type AppConfig = BackendEnv;

/**
 * Load and validate backend configuration from environment variables.
 *
 * API_PORT takes precedence over PORT when both are set. The override is
 * applied *before* Zod validation so that a valid API_PORT can compensate
 * for an absent or malformed PORT (e.g. PORT="" with API_PORT=3001).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const effective: Record<string, string | undefined> = { ...env };

  // Normalize blank values to undefined so Zod defaults apply
  if (!effective['PORT']?.trim()) {
    effective['PORT'] = undefined;
  }

  // API_PORT takes precedence over PORT when set
  const apiPort = effective['API_PORT']?.trim();
  if (apiPort) {
    effective['PORT'] = apiPort;
  }

  const config = parseBackendEnv(effective);

  const validation = validateBackendEnvConsistency(config);
  if (!validation.ok) {
    throw new Error(
      `Environment consistency validation failed:\n${validation.errors.join('\n')}\n\nFix these issues before starting the server.`,
    );
  }

  return config;
}
