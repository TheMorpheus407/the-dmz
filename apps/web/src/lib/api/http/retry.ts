export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function isIdempotentMethod(method: string): boolean {
  return method === 'GET' || method === 'DELETE';
}

function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, maxDelay);
}

export function isRetryableStatus(status: number, retryableStatuses: number[]): boolean {
  return retryableStatuses.includes(status);
}

export function isRetryableError(error: { code?: string }, retryableErrors: string[]): boolean {
  return error.code ? retryableErrors.includes(error.code) : false;
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryHandler {
  private config: RetryConfig;

  constructor(config: RetryConfig | null) {
    this.config = {
      maxAttempts: config?.maxAttempts ?? 3,
      baseDelayMs: config?.baseDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 10000,
      retryableStatuses: config?.retryableStatuses ?? [429, 500, 502, 503, 504],
      retryableErrors: config?.retryableErrors ?? ['ECONNRESET', 'ETIMEDOUT', 'NETWORK_ERROR'],
    };
  }

  setMaxAttempts(maxAttempts: number): void {
    this.config.maxAttempts = maxAttempts;
  }

  setBaseDelayMs(baseDelayMs: number): void {
    this.config.baseDelayMs = baseDelayMs;
  }

  setMaxDelayMs(maxDelayMs: number): void {
    this.config.maxDelayMs = maxDelayMs;
  }

  setRetryableStatuses(retryableStatuses: number[]): void {
    this.config.retryableStatuses = retryableStatuses;
  }

  setRetryableErrors(retryableErrors: string[]): void {
    this.config.retryableErrors = retryableErrors;
  }

  shouldRetryByStatus(status: number): boolean {
    return isRetryableStatus(status, this.config.retryableStatuses);
  }

  shouldRetryByError(error: { code?: string }): boolean {
    return isRetryableError(error, this.config.retryableErrors);
  }

  getBackoffDelay(attempt: number): number {
    return calculateBackoff(attempt, this.config.baseDelayMs, this.config.maxDelayMs);
  }

  getMaxAttempts(): number {
    return this.config.maxAttempts;
  }

  canRetry(attempt: number): boolean {
    return attempt < this.config.maxAttempts - 1;
  }
}
