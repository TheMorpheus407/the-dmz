import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { sendPendingStatements } from '../xapi.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import type { AppConfig } from '../../../config.js';
import type { XapiStatement, XapiLrsConfig } from '../../../db/schema/lrs/index.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../xapi.service.js', async () => {
  const actual = await vi.importActual('../xapi.service.js');
  return {
    ...actual,
    decryptSecret: () => 'decrypted-secret',
  };
});

const mockConfig = {
  DATABASE_URL: 'postgresql://localhost:5432/test',
} as unknown as AppConfig;

const mockTenantId = '550e8400-e29b-41d4-a716-446655440001';

function createMockStatement(overrides: Partial<XapiStatement> = {}): XapiStatement {
  return {
    id: 'statement-id-1',
    tenantId: mockTenantId,
    statementId: 'stmt-uuid-1',
    statementVersion: '1.0.3',
    actorMbox: 'mailto:test@example.com',
    actorName: 'Test User',
    verbId: 'http://adlnet.gov/expapi/verbs/completed',
    verbDisplay: { 'en-US': 'completed' },
    objectId: 'https://the-dmz.example.com/xapi/activities/test',
    objectType: 'Activity',
    objectName: null,
    objectDescription: null,
    resultScore: null,
    resultSuccess: null,
    resultCompletion: null,
    resultDuration: null,
    contextTenant: null,
    contextSession: null,
    contextCampaign: null,
    contextCampaignSession: null,
    contextExtensions: null,
    storedAt: new Date('2024-01-15T10:30:00Z'),
    sentAt: null,
    lrsEndpoint: null,
    lrsStatus: 'pending',
    lrsError: null,
    retryCount: 0,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockLrsConfig(overrides: Partial<XapiLrsConfig> = {}): XapiLrsConfig {
  return {
    id: 'lrs-config-id-1',
    tenantId: mockTenantId,
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

interface MockQueryBuilder {
  results: unknown[];
  then: (
    onfulfilled: (value: unknown[]) => unknown,
    onrejected?: (reason: unknown) => unknown,
  ) => MockQueryBuilder;
  from: () => MockQueryBuilder;
  where: () => MockQueryBuilder;
  orderBy: () => MockQueryBuilder;
  limit: () => MockQueryBuilder;
  returning: () => Promise<unknown[]>;
  set: (values: Record<string, unknown>) => MockQueryBuilder;
  values: (values: unknown) => MockQueryBuilder;
}

function createMockDb(selectResults: unknown[][] = [], updateResults: unknown[][] = []) {
  const createQueryBuilder = (results: unknown[][]): MockQueryBuilder => {
    const currentResults = results;
    let callIndex = 0;

    return {
      results: [],
      then(onfulfilled, onrejected) {
        const result = Promise.resolve(this.results).then(onfulfilled, onrejected);
        return result as unknown as MockQueryBuilder;
      },
      from() {
        return this;
      },
      where() {
        this.results = currentResults[callIndex] ?? [];
        callIndex++;
        return this;
      },
      orderBy() {
        return this;
      },
      limit() {
        if (this.results.length === 0 && currentResults.length > callIndex) {
          this.results = currentResults[callIndex] ?? [];
          callIndex++;
        }
        return this;
      },
      returning() {
        this.results = results.length > 0 ? (results.shift() ?? []) : [];
        return Promise.resolve(this.results);
      },
      set(_values) {
        return this;
      },
      values(_values) {
        return this;
      },
    };
  };

  const mockDb = {
    select: vi.fn().mockImplementation(() => {
      const builder = createQueryBuilder(selectResults);
      return builder;
    }),
    update: vi.fn().mockImplementation(() => {
      const builder = createQueryBuilder(updateResults);
      return builder;
    }),
    insert: vi.fn().mockImplementation(() => {
      const builder = createQueryBuilder(updateResults);
      return builder;
    }),
  };

  return mockDb;
}

const mockFetch = vi.fn();

beforeEach(() => {
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendPendingStatements', () => {
  beforeEach(() => {
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([], []) as unknown as ReturnType<typeof getDatabaseClient>,
    );
  });

  it('should return { sent: 0, failed: 0 } when no pending statements exist', async () => {
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([[]]) as unknown as ReturnType<typeof getDatabaseClient>,
    );

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it('should return { sent: 0, failed: 0 } when no LRS config exists', async () => {
    const statements = [createMockStatement()];
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, []]) as unknown as ReturnType<typeof getDatabaseClient>,
    );

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it('should return { sent: 0, failed: 0 } when LRS config is disabled', async () => {
    const statements = [createMockStatement()];
    const disabledLrsConfig = createMockLrsConfig({ enabled: false });
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [disabledLrsConfig]]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it('should send statements and return sent count on success', async () => {
    const statements = [createMockStatement()];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 1, failed: 0 });
  });

  it('should return failed count on LRS error', async () => {
    const statements = [createMockStatement()];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error',
    } as Response);

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 0, failed: 1 });
  });

  it('should send multiple statements', async () => {
    const statements = [
      createMockStatement({ id: 'stmt-1', statementId: 'stmt-uuid-1' }),
      createMockStatement({ id: 'stmt-2', statementId: 'stmt-uuid-2' }),
      createMockStatement({ id: 'stmt-3', statementId: 'stmt-uuid-3' }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 3, failed: 0 });
  });

  it('should build statement with object.definition.name when objectName is present', async () => {
    const statements = [
      createMockStatement({
        objectName: 'Email Triage Training',
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    expect(sentBody[0].object.definition?.name?.['en-US']).toBe('Email Triage Training');
  });

  it('should build statement with object.definition.description when objectDescription is present', async () => {
    const statements = [
      createMockStatement({
        objectDescription: 'Learn to identify phishing emails',
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    expect(sentBody[0].object.definition?.description?.['en-US']).toBe(
      'Learn to identify phishing emails',
    );
  });

  it('should build statement with result.score when resultScore is present', async () => {
    const statements = [
      createMockStatement({
        resultScore: 85,
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    expect(sentBody[0].result?.score?.raw).toBe(85);
    expect(sentBody[0].result?.score?.min).toBe(0);
    expect(sentBody[0].result?.score?.max).toBe(100);
    expect(sentBody[0].result?.score?.scaled).toBe(0.85);
  });

  it('should build statement with result.success when resultSuccess is present', async () => {
    const statements = [
      createMockStatement({
        resultSuccess: true,
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    expect(sentBody[0].result?.success).toBe(true);
  });

  it('should build statement with result.completion when resultCompletion is present', async () => {
    const statements = [
      createMockStatement({
        resultCompletion: true,
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    expect(sentBody[0].result?.completion).toBe(true);
  });

  it('should build statement with result.duration when resultDuration is present', async () => {
    const statements = [
      createMockStatement({
        resultDuration: 120,
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    expect(sentBody[0].result?.duration).toBe('PT2M');
  });

  it('should build statement with all optional fields when present', async () => {
    const statements = [
      createMockStatement({
        objectName: 'Email Triage Training',
        objectDescription: 'Learn to identify phishing emails',
        resultScore: 95,
        resultSuccess: true,
        resultCompletion: true,
        resultDuration: 180,
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    const stmt = sentBody[0];

    expect(stmt.object.definition?.name?.['en-US']).toBe('Email Triage Training');
    expect(stmt.object.definition?.description?.['en-US']).toBe(
      'Learn to identify phishing emails',
    );
    expect(stmt.result?.score?.raw).toBe(95);
    expect(stmt.result?.success).toBe(true);
    expect(stmt.result?.completion).toBe(true);
    expect(stmt.result?.duration).toBe('PT3M');
  });

  it('should build minimal statement without optional fields', async () => {
    const statements = [
      createMockStatement({
        objectName: null,
        objectDescription: null,
        resultScore: null,
        resultSuccess: null,
        resultCompletion: null,
        resultDuration: null,
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);
    const stmt = sentBody[0];

    expect(stmt.object.definition).toBeUndefined();
    expect(stmt.result).toBeUndefined();
  });

  it('should only include result object when resultScore or resultSuccess is non-null', async () => {
    const statements = [
      createMockStatement({
        resultScore: null,
        resultSuccess: null,
        resultCompletion: null,
        resultDuration: null,
      }),
      createMockStatement({
        id: 'stmt-2',
        statementId: 'stmt-uuid-2',
        resultScore: 50,
        resultSuccess: false,
        resultCompletion: true,
        resultDuration: 60,
      }),
    ];
    const lrsConfig = createMockLrsConfig();
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((fetchCall as [string, { body: string }])[1].body);

    expect(sentBody[0].result).toBeUndefined();
    expect(sentBody[1].result).toBeDefined();
    expect(sentBody[1].result?.score?.raw).toBe(50);
    expect(sentBody[1].result?.success).toBe(false);
  });

  it('should handle LRS config with version 2.0', async () => {
    const statements = [createMockStatement()];
    const lrsConfig = createMockLrsConfig({ version: '2.0' });
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await sendPendingStatements(mockConfig, mockTenantId);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers['X-Experience-API-Version']).toBe('2.0');
  });

  it('should retry on failure and eventually fail', async () => {
    const statements = [createMockStatement()];
    const lrsConfig = createMockLrsConfig({ retryMaxAttempts: 3, retryBaseDelayMs: 100 });
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server error',
    } as Response);

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should succeed on retry after initial failure', async () => {
    const statements = [createMockStatement()];
    const lrsConfig = createMockLrsConfig({ retryMaxAttempts: 3, retryBaseDelayMs: 100 });
    vi.mocked(getDatabaseClient).mockReturnValue(
      createMockDb([statements, [lrsConfig]], [[], []]) as unknown as ReturnType<
        typeof getDatabaseClient
      >,
    );

    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    const result = await sendPendingStatements(mockConfig, mockTenantId);

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
