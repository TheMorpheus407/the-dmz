import { dev } from '$app/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MINIMUM_PROD_LEVEL: LogLevel = 'warn';

const SENSITIVE_FIELDS = ['password', 'token', 'authorization', 'apiKey', 'apikey', 'secret'];

function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function shouldLog(level: LogLevel, currentLevel: LogLevel): boolean {
  if (dev) {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
  }
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MINIMUM_PROD_LEVEL];
}

function formatMessage(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): string {
  const prefix = `[${level.toUpperCase()}]`;
  if (context) {
    const redactedContext = redactSensitive(context);
    return `${prefix} ${message} ${JSON.stringify(redactedContext)}`;
  }
  return `${prefix} ${message}`;
}

const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (!dev) return;
    if (!shouldLog('debug', 'debug')) return;
    const formatted = formatMessage('debug', message, context);
    console.debug(formatted);
  },

  info(message: string, context?: Record<string, unknown>): void {
    if (!dev) return;
    if (!shouldLog('info', 'info')) return;
    const formatted = formatMessage('info', message, context);
    console.info(formatted);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    if (!shouldLog('warn', 'warn')) return;
    const formatted = formatMessage('warn', message, context);
    console.warn(formatted);
  },

  error(message: string, context?: Record<string, unknown>): void {
    if (!shouldLog('error', 'error')) return;
    const formatted = formatMessage('error', message, context);
    console.error(formatted);
  },
};

export { logger };
export type { LogEntry };
