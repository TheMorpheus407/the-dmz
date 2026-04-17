import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({
  dev: true,
}));

describe('logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('structured output format', () => {
    it('debug outputs correct format with context', async () => {
      const { logger } = await import('./logger');
      logger.debug('Test message', { key: 'value' });

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Test message {"key":"value"}');
    });

    it('info outputs correct format with context', async () => {
      const { logger } = await import('./logger');
      logger.info('Test message', { key: 'value' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Test message {"key":"value"}');
    });

    it('warn outputs correct format with context', async () => {
      const { logger } = await import('./logger');
      logger.warn('Test message', { key: 'value' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test message {"key":"value"}');
    });

    it('error outputs correct format with context', async () => {
      const { logger } = await import('./logger');
      logger.error('Test message', { key: 'value' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test message {"key":"value"}');
    });

    it('outputs correct format without context', async () => {
      const { logger } = await import('./logger');
      logger.info('Simple message');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Simple message');
    });

    it('outputs correct format with empty context object', async () => {
      const { logger } = await import('./logger');
      logger.info('Message with empty context', {});

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Message with empty context {}');
    });

    it('serializes nested context objects', async () => {
      const { logger } = await import('./logger');
      logger.info('Nested context', { outer: { inner: 'value' }, array: [1, 2, 3] });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] Nested context {"outer":{"inner":"value"},"array":[1,2,3]}',
      );
    });

    it('serializes context with special characters in strings', async () => {
      const { logger } = await import('./logger');
      logger.info('Special chars', { text: 'Hello "world" and \\n escape' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] Special chars {"text":"Hello \\"world\\" and \\\\n escape"}',
      );
    });
  });

  describe('log level filtering', () => {
    it('logs debug when current level is debug', async () => {
      const { logger } = await import('./logger');
      logger.debug('debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug message');
    });

    it('logs info when current level is info', async () => {
      const { logger } = await import('./logger');
      logger.info('info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message');
    });

    it('logs warn when current level is warn', async () => {
      const { logger } = await import('./logger');
      logger.warn('warn message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
    });

    it('logs error when current level is error', async () => {
      const { logger } = await import('./logger');
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
    });

    it('logs at or above current level in dev mode', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: true }));

      const { logger } = await import('./logger');

      consoleDebugSpy.mockImplementation(() => {});
      consoleInfoSpy.mockImplementation(() => {});
      consoleWarnSpy.mockImplementation(() => {});
      consoleErrorSpy.mockImplementation(() => {});

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug msg');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info msg');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn msg');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error msg');

      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: true }));
    });
  });

  describe('context serialization', () => {
    it('serializes null values as null', async () => {
      const { logger } = await import('./logger');
      logger.info('null value', { nullable: null });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] null value {"nullable":null}');
    });

    it('omits undefined values in context (JSON.stringify behavior)', async () => {
      const { logger } = await import('./logger');
      logger.info('undefined value', { maybe: undefined });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] undefined value {}');
    });

    it('serializes boolean values correctly', async () => {
      const { logger } = await import('./logger');
      logger.info('booleans', { truthy: true, falsy: false });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] booleans {"truthy":true,"falsy":false}');
    });

    it('serializes numeric values correctly', async () => {
      const { logger } = await import('./logger');
      logger.info('numbers', { integer: 42, float: 3.14, negative: -10 });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] numbers {"integer":42,"float":3.14,"negative":-10}',
      );
    });

    it('serializes array values correctly', async () => {
      const { logger } = await import('./logger');
      logger.info('array', { items: ['a', 'b', 'c'] });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] array {"items":["a","b","c"]}');
    });

    it('handles context with multiple mixed properties', async () => {
      const { logger } = await import('./logger');
      logger.info('mixed', {
        string: 'hello',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] mixed {"string":"hello","number":123,"boolean":true,"null":null,"array":[1,2,3]}',
      );
    });
  });

  describe('production behavior', () => {
    it('does not log debug in production', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: false }));

      const { logger } = await import('./logger');
      logger.debug('should not appear');

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: true }));
    });

    it('does not log info in production', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: false }));

      const { logger } = await import('./logger');
      logger.info('should not appear');

      expect(consoleInfoSpy).not.toHaveBeenCalled();

      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: true }));
    });

    it('logs warn in production', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: false }));

      const { logger } = await import('./logger');
      logger.warn('warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warning message');

      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: true }));
    });

    it('logs error in production', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: false }));

      const { logger } = await import('./logger');
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');

      vi.resetModules();
      vi.doMock('$app/environment', () => ({ dev: true }));
    });
  });

  describe('sensitive field redaction', () => {
    it('redacts password field', async () => {
      const { logger } = await import('./logger');
      logger.info('login attempt', { username: 'user@example.com', password: 'secret123' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] login attempt {"username":"user@example.com","password":"[REDACTED]"}',
      );
    });

    it('redacts token field', async () => {
      const { logger } = await import('./logger');
      logger.info('auth', { token: 'jwt-token-here', userId: 123 });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] auth {"token":"[REDACTED]","userId":123}',
      );
    });

    it('redacts authorization field', async () => {
      const { logger } = await import('./logger');
      logger.info('request', { authorization: 'Bearer secret-token', method: 'GET' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] request {"authorization":"[REDACTED]","method":"GET"}',
      );
    });

    it('redacts apiKey field', async () => {
      const { logger } = await import('./logger');
      logger.info('api call', { apiKey: 'key-12345', endpoint: '/api/users' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] api call {"apiKey":"[REDACTED]","endpoint":"/api/users"}',
      );
    });

    it('redacts secret field', async () => {
      const { logger } = await import('./logger');
      logger.info('config', { secret: 'my-secret-value', env: 'production' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] config {"secret":"[REDACTED]","env":"production"}',
      );
    });

    it('redacts multiple sensitive fields in same log', async () => {
      const { logger } = await import('./logger');
      logger.info('auth request', {
        username: 'admin',
        password: 'pass123',
        token: 'jwt-token',
        apiKey: 'key-abc',
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] auth request {"username":"admin","password":"[REDACTED]","token":"[REDACTED]","apiKey":"[REDACTED]"}',
      );
    });

    it('does not redact non-sensitive fields', async () => {
      const { logger } = await import('./logger');
      logger.info('user action', { userId: 123, action: 'login', timestamp: 1234567890 });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] user action {"userId":123,"action":"login","timestamp":1234567890}',
      );
    });

    it('redacts nested sensitive fields', async () => {
      const { logger } = await import('./logger');
      logger.info('nested', { user: { name: 'John', password: 'secret' } });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] nested {"user":{"name":"John","password":"[REDACTED]"}}',
      );
    });

    it('redacts PASSWORD field (uppercase)', async () => {
      const { logger } = await import('./logger');
      logger.info('auth', { PASSWORD: 'secret123' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] auth {"PASSWORD":"[REDACTED]"}');
    });

    it('redacts Password field (mixed case)', async () => {
      const { logger } = await import('./logger');
      logger.info('auth', { Password: 'secret456' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] auth {"Password":"[REDACTED]"}');
    });

    it('redacts pAsSwOrD field (mixed case)', async () => {
      const { logger } = await import('./logger');
      logger.info('auth', { pAsSwOrD: 'secret789' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] auth {"pAsSwOrD":"[REDACTED]"}');
    });

    it('redacts AUTHORIZATION field (uppercase)', async () => {
      const { logger } = await import('./logger');
      logger.info('request', { AUTHORIZATION: 'Bearer token' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] request {"AUTHORIZATION":"[REDACTED]"}');
    });

    it('redacts Token field (mixed case)', async () => {
      const { logger } = await import('./logger');
      logger.info('auth', { Token: 'jwt-token' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] auth {"Token":"[REDACTED]"}');
    });

    it('redacts secret field case-insensitively', async () => {
      const { logger } = await import('./logger');
      logger.info('config', { SECRET: 'value1', Secret: 'value2', sEcReT: 'value3' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[INFO] config {"SECRET":"[REDACTED]","Secret":"[REDACTED]","sEcReT":"[REDACTED]"}',
      );
    });
  });
});
