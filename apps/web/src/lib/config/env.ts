import {
  type FrontendEnv,
  parseFrontendEnv,
  validateFrontendEnvConsistency,
} from '@the-dmz/shared';

let cachedConfig: FrontendEnv | undefined;

/**
 * Validate and return the frontend environment configuration.
 *
 * Uses `process.env` which is available in SvelteKit server hooks.
 * The result is cached after the first call so validation only runs once.
 */
export function loadFrontendConfig(
  env: Record<string, string | undefined> = process.env,
): FrontendEnv {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = parseFrontendEnv(env);

  const validation = validateFrontendEnvConsistency(config);
  if (!validation.ok) {
    throw new Error(
      `Environment consistency validation failed:\n${validation.errors.join('\n')}\n\nFix these issues before starting the server.`,
    );
  }

  cachedConfig = config;
  return cachedConfig;
}

/**
 * Reset the cached config. Only used in tests.
 */
export function resetFrontendConfigCache(): void {
  cachedConfig = undefined;
}
