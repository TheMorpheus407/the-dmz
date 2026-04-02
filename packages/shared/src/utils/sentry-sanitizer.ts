const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'authorization',
  'credential',
  'private_key',
  'public_key',
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(\+?1?[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

function sanitizeValue(value: unknown, depth: number = 0): unknown {
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (value.length > 200) {
      return value.slice(0, 200) + '...[TRUNCATED]';
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val, depth + 1);
      }
    }
    return sanitized;
  }

  return '[UNKNOWN]';
}

function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }
  let result = str.replace(EMAIL_PATTERN, '[EMAIL_REDACTED]');
  result = result.replace(PHONE_PATTERN, '[PHONE_REDACTED]');
  return result;
}

export function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  if (!context || typeof context !== 'object') {
    return context;
  }

  const sanitized = sanitizeValue(context);
  if (typeof sanitized === 'object' && sanitized !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        result[key] = sanitizeString(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return sanitized as Record<string, unknown>;
}
