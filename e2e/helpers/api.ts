const DEFAULT_WEB_BASE_URL = 'http://127.0.0.1:5173';
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000';

export const resolveWebBaseUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  env.PLAYWRIGHT_BASE_URL ?? DEFAULT_WEB_BASE_URL;

export const resolveApiBaseUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  env.PLAYWRIGHT_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const buildApiUrl = (path: string, env: NodeJS.ProcessEnv = process.env): string =>
  new URL(path, resolveApiBaseUrl(env)).toString();
