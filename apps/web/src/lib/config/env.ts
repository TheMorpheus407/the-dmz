import { type FrontendEnv, parseFrontendEnv } from '@the-dmz/shared';

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

  cachedConfig = parseFrontendEnv(env);
  return cachedConfig;
}

/**
 * Reset the cached config. Only used in tests.
 */
export function resetFrontendConfigCache(): void {
  cachedConfig = undefined;
}
