import { afterEach } from 'vitest';

process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';
process.env['XAPI_ENCRYPTION_KEY'] = 'test-encryption-key-that-is-at-least-32-bytes-long';

afterEach(() => {
  // Placeholder for future teardown hooks.
});
