export interface HttpExecutorConfig {
  baseUrl: string;
  defaultHeaders: Record<string, string>;
  credentials: RequestCredentials;
  timeout: number;
}

export interface RequestInitOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  credentials?: RequestCredentials;
}

export class HttpExecutor {
  private config: HttpExecutorConfig;

  constructor(config: Partial<HttpExecutorConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? 'http://localhost:3001',
      defaultHeaders: config.defaultHeaders ?? {},
      credentials: config.credentials ?? 'same-origin',
      timeout: config.timeout ?? 0,
    };
  }

  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  getConfig(): Readonly<HttpExecutorConfig> {
    return { ...this.config };
  }

  buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let urlString = `${this.config.baseUrl}${normalizedPath}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      urlString += `?${searchParams.toString()}`;
    }

    return urlString;
  }

  buildHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      ...this.config.defaultHeaders,
      ...additionalHeaders,
    };
  }

  createRequestInit(
    method: string,
    headers: Record<string, string>,
    body?: string,
    credentials?: RequestCredentials,
  ): RequestInit {
    const requestInit: RequestInit = {
      method,
      headers,
      credentials: credentials ?? this.config.credentials ?? 'same-origin',
    };

    if (body) {
      requestInit.body = body;
    }

    return requestInit;
  }

  async parseJsonResponse<T = unknown>(response: Response): Promise<T | undefined> {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return undefined;
    }
    return response.json() as Promise<T>;
  }
}

export function buildApiUrl(path: string, baseUrl: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
