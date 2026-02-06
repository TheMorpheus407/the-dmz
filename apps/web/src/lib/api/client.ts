export interface ApiClientConfig {
  baseUrl: string;
}

export const defaultApiClientConfig: ApiClientConfig = {
  baseUrl: '/api/v1',
};

export const buildApiUrl = (
  path: string,
  config: ApiClientConfig = defaultApiClientConfig,
): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseUrl}${normalizedPath}`;
};
