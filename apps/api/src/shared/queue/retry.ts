export const EXPONENTIAL_BACKOFF_DELAYS = [
  30 * 1000,
  2 * 60 * 1000,
  10 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
] as const;

export const RETRY_STRATEGY = (attempt: number): number => {
  const index = Math.min(attempt - 1, EXPONENTIAL_BACKOFF_DELAYS.length - 1);
  return (
    EXPONENTIAL_BACKOFF_DELAYS[index] ??
    EXPONENTIAL_BACKOFF_DELAYS[EXPONENTIAL_BACKOFF_DELAYS.length - 1]!
  );
};

export function getQueueConfig(redisUrl: string) {
  return {
    connection: {
      host: new URL(redisUrl).hostname,
      port: parseInt(new URL(redisUrl).port, 10) || 6379,
    },
  };
}
