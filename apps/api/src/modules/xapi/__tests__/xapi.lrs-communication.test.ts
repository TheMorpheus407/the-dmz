import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { sendStatementToLrs } from '../xapi.service.js';

import type { XapiLrsConfig, XapiStatementDoc } from '../../db/schema/lrs/index.js';

const MOCK_STATEMENT: XapiStatementDoc = {
  id: 'statement-1',
  actor: {
    objectType: 'Agent',
    mbox: 'mailto:test@example.com',
    name: 'Test User',
  },
  verb: {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed' },
  },
  object: {
    objectType: 'Activity',
    id: 'https://the-dmz.example.com/xapi/activities/test',
  },
  timestamp: new Date().toISOString(),
  stored: new Date().toISOString(),
};

function createMockLrsConfig(overrides: Partial<XapiLrsConfig> = {}): XapiLrsConfig {
  return {
    id: 'lrs-config-1',
    tenantId: 'tenant-1',
    name: 'Test LRS',
    endpoint: 'https://lrs.example.com/data/xAPI',
    authKeyId: 'test-key-id',
    authSecretEncrypted:
      '7f40a3fb23b6e4a2e95d7486216d1266:801fde9e954331e5d57ef461bb6e827f:c36b1508d5b0d76df9b10b67a0f3345a',
    version: '1.0.3',
    enabled: true,
    batchingEnabled: true,
    batchSize: 10,
    retryMaxAttempts: 3,
    retryBaseDelayMs: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mockFetch = vi.fn();

vi.mock('../xapi.service.js', async () => {
  const actual = await vi.importActual('../xapi.service.js');
  return {
    ...actual,
    decryptSecret: () => 'decrypted-secret',
  };
});

vi.mocked(mockFetch).mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
} as Response);

describe('sendStatementToLrs', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return success true on HTTP 200 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should return success true on HTTP 201 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      statusText: 'Created',
    } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result).toEqual({ success: true });
  });

  it('should retry on HTTP 400 and return error after all retries exhausted', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'Invalid statement format',
    } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('400');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on HTTP 401 and return error after all retries exhausted', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid credentials',
    } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on HTTP 500 and return error after all retries exhausted', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error',
    } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on HTTP 503 and return error after all retries exhausted', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => 'Service temporarily unavailable',
    } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('503');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on network error and return error after all retries exhausted', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('ECONNREFUSED');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should succeed on second attempt after initial failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should succeed on third attempt after two failures', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response);

    const result = await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    expect(result).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should send correct headers including Basic Auth', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    const expectedAuthHeader = `Basic ${Buffer.from('test-key-id:decrypted-secret').toString('base64')}`;
    expect(fetch).toHaveBeenCalledWith(
      'https://lrs.example.com/data/xAPI/statements',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: expectedAuthHeader,
          'X-Experience-API-Version': '1.0.3',
        }),
        body: JSON.stringify([MOCK_STATEMENT]),
      }),
    );
  });

  it('should send statements array as JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const multipleStatements = [MOCK_STATEMENT, { ...MOCK_STATEMENT, id: 'statement-2' }];

    await sendStatementToLrs(createMockLrsConfig(), multipleStatements);

    expect(fetch).toHaveBeenCalledWith(
      'https://lrs.example.com/data/xAPI/statements',
      expect.objectContaining({
        body: JSON.stringify(multipleStatements),
      }),
    );
  });

  it('should use xAPI version 2.0 when configured', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendStatementToLrs(createMockLrsConfig({ version: '2.0' }), [MOCK_STATEMENT]);

    expect(fetch).toHaveBeenCalledWith(
      'https://lrs.example.com/data/xAPI/statements',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Experience-API-Version': '2.0',
        }),
      }),
    );
  });
});

describe('sendStatementToLrs with fake timers', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    vi.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should use exponential backoff delay between retries', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const timestamps: number[] = [];
    const originalFetch = mockFetch;
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      timestamps.push(callCount);
      throw new Error('ECONNREFUSED');
    });

    const sendPromise = sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    await vi.advanceTimersByTimeAsync(0);
    expect(timestamps.length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(timestamps.length).toBe(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(timestamps.length).toBe(3);

    mockFetch.mockImplementation(originalFetch);
    const result = await sendPromise;

    expect(result.success).toBe(false);
    expect(timestamps.length).toBe(3);
  });

  it('should not delay after last attempt', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const sendPromise = sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(3);

    const result = await sendPromise;
    expect(result.success).toBe(false);
  });

  it('should delay by baseDelay * 2^attempt between retries', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const timestamps: number[] = [];
    const originalFetch = mockFetch;
    mockFetch.mockImplementation(async () => {
      timestamps.push(Date.now());
      throw new Error('ECONNREFUSED');
    });

    const sendPromise = sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    mockFetch.mockImplementation(originalFetch);
    const result = await sendPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('ECONNREFUSED');
    expect(timestamps.length).toBe(3);
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(990);
    expect(timestamps[1] - timestamps[0]).toBeLessThanOrEqual(1100);
    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(1990);
    expect(timestamps[2] - timestamps[1]).toBeLessThanOrEqual(2100);
  });

  it('should use custom base delay when configured', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const timestamps: number[] = [];
    const originalFetch = mockFetch;
    mockFetch.mockImplementation(async () => {
      timestamps.push(Date.now());
      throw new Error('ECONNREFUSED');
    });

    const sendPromise = sendStatementToLrs(createMockLrsConfig({ retryBaseDelayMs: 500 }), [
      MOCK_STATEMENT,
    ]);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);

    mockFetch.mockImplementation(originalFetch);
    const result = await sendPromise;

    expect(result.success).toBe(false);
    expect(timestamps.length).toBe(3);
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(490);
    expect(timestamps[1] - timestamps[0]).toBeLessThanOrEqual(550);
    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(990);
    expect(timestamps[2] - timestamps[1]).toBeLessThanOrEqual(1100);
  });

  it('should succeed on second attempt with correct timing', async () => {
    const timestamps: number[] = [];
    const originalFetch = mockFetch;
    mockFetch.mockImplementation(async () => {
      timestamps.push(Date.now());
      if (timestamps.length === 1) {
        throw new Error('ECONNREFUSED');
      }
      return { ok: true, status: 200, statusText: 'OK' } as Response;
    });

    const sendPromise = sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);

    mockFetch.mockImplementation(originalFetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const result = await sendPromise;
    expect(result).toEqual({ success: true });
    expect(timestamps.length).toBe(2);
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(990);
    expect(timestamps[1] - timestamps[0]).toBeLessThanOrEqual(1100);
  });

  it('should return error with last error message after retries exhausted', async () => {
    mockFetch.mockRejectedValue(new Error('Connection reset by peer'));

    const sendPromise = sendStatementToLrs(createMockLrsConfig(), [MOCK_STATEMENT]);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await sendPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection reset by peer');
  });

  it('should use custom retry config with 5 max attempts', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const timestamps: number[] = [];
    const originalFetch = mockFetch;
    mockFetch.mockImplementation(async () => {
      timestamps.push(Date.now());
      throw new Error('ECONNREFUSED');
    });

    const sendPromise = sendStatementToLrs(createMockLrsConfig({ retryMaxAttempts: 5 }), [
      MOCK_STATEMENT,
    ]);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(8000);

    mockFetch.mockImplementation(originalFetch);
    const result = await sendPromise;

    expect(result.success).toBe(false);
    expect(timestamps.length).toBe(5);
    for (let i = 1; i < timestamps.length; i++) {
      const delta = timestamps[i] - timestamps[i - 1];
      const minExpected = [990, 1990, 3990, 7990][i - 1];
      const maxExpected = [1100, 2100, 4100, 8100][i - 1];
      expect(delta).toBeGreaterThanOrEqual(minExpected);
      expect(delta).toBeLessThanOrEqual(maxExpected);
    }
  });
});
