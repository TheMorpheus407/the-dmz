import { describe, expect, it } from 'vitest';

describe('logger', () => {
  it('should be importable', async () => {
    const { logger } = await import('./logger');
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
