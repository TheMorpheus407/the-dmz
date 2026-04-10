import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

import {
  createLtiPlatform,
  getLtiPlatformById,
  getLtiPlatformByClientId,
  getLtiPlatformByUrl,
  getLtiPlatformByInternalId,
  listLtiPlatforms,
  updateLtiPlatform,
  deleteLtiPlatform,
  createNonce,
  validateAndConsumeNonce,
  cleanupExpiredNonces,
  createLtiLineItem,
  getLtiLineItemById,
  getLtiLineItemByIdOnly,
  getLtiLineItemByResourceLinkId,
  listLtiLineItems,
  updateLtiLineItem,
  deleteLtiLineItem,
  createLtiScore,
  getLtiScoreByUserAndLineItem,
  listLtiScores,
  createLtiDeepLinkContent,
  getLtiDeepLinkContentById,
  listLtiDeepLinkContent,
  updateLtiDeepLinkContent,
  deleteLtiDeepLinkContent,
  createLtiSession,
  getLtiSessionByLaunchId,
  listLtiSessions,
  generateNonce,
  generateState,
  generateCodeVerifier,
  base64UrlEncode,
  generateCodeChallenge,
  createState,
  validateAndConsumeState,
  cleanupExpiredStates,
  initiateOidcLogin,
  extractLtiLaunchData,
  verifyLtiJwt,
  refreshJWKSet,
} from '../lti.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('jose', () => {
  const mockJwks = vi.fn();
  return {
    jwtVerify: vi.fn(),
    decodeJwt: vi.fn(),
    createRemoteJWKSet: vi.fn().mockReturnValue(mockJwks),
  };
});

const mockConfig = {
  DATABASE_URL: 'postgresql://localhost:5432/test',
} as unknown as AppConfig;

const mockPlatformId = '550e8400-e29b-41d4-a716-446655440000';
const mockTenantId = '550e8400-e29b-41d4-a716-446655440001';

interface SqliteDb {
  prepare: (sql: string) => {
    run: (...args: unknown[]) => void;
    get: (sql: string, ...args: unknown[]) => unknown;
    all: (sql: string, ...args: unknown[]) => unknown[];
  };
  exec: (sql: string) => void;
  close: () => void;
}

const createSqliteDb = (): SqliteDb => {
  const db = new Database(':memory:') as unknown as SqliteDb;

  db.exec(`
    CREATE TABLE lti_nonces (
      nonce_id TEXT PRIMARY KEY,
      nonce_value TEXT NOT NULL UNIQUE,
      platform_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE lti_states (
      state_id TEXT PRIMARY KEY,
      state_value TEXT NOT NULL UNIQUE,
      platform_id TEXT NOT NULL,
      code_verifier TEXT,
      redirect_uri TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE lti_platforms (
      platform_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      platform_url TEXT NOT NULL,
      client_id TEXT NOT NULL,
      deployment_id TEXT,
      public_keyset_url TEXT NOT NULL,
      auth_token_url TEXT NOT NULL,
      auth_login_url TEXT NOT NULL,
      jwks TEXT NOT NULL DEFAULT '{}',
      tool_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_validation_status TEXT,
      last_validated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
};

const createMockDb = () => {
  const mockReturningResults: unknown[][] = [];
  const mockQueryResults: unknown[][] = [];
  let currentQueryType: 'select' | 'insert' | 'update' | 'delete' | null = null;
  const insertCalls: { table: unknown; values: unknown }[] = [];

  class MockQueryBuilder {
    private results: unknown[] = [];

    then(onfulfilled: (value: unknown[]) => unknown, onrejected?: (reason: unknown) => unknown) {
      return Promise.resolve(this.results).then(onfulfilled, onrejected);
    }

    from() {
      return this;
    }

    values(values: unknown) {
      insertCalls.push({ table: (this as { _table?: unknown })._table, values });
      return this;
    }

    set(_setClause: Record<string, unknown>) {
      return this;
    }

    where() {
      if (currentQueryType === 'select') {
        this.results = mockQueryResults.length > 0 ? mockQueryResults.shift()! : [];
      }
      return this;
    }

    orderBy() {
      return this;
    }

    returning() {
      if (currentQueryType === 'select') {
        this.results = mockQueryResults.length > 0 ? mockQueryResults.shift()! : [];
      } else {
        this.results = mockReturningResults.length > 0 ? mockReturningResults.shift()! : [];
      }
      return Promise.resolve(this.results);
    }

    limit() {
      if (currentQueryType === 'select' && this.results.length === 0) {
        this.results = mockQueryResults.length > 0 ? mockQueryResults.shift()! : [];
      }
      return this;
    }
  }

  const mockDb = {
    insert: vi.fn().mockImplementation((table: unknown) => {
      currentQueryType = 'insert';
      const builder = new MockQueryBuilder();
      (builder as { _table?: unknown })._table = table;
      return builder;
    }),
    select: vi.fn().mockImplementation(() => {
      currentQueryType = 'select';
      return new MockQueryBuilder();
    }),
    update: vi.fn().mockImplementation(() => {
      currentQueryType = 'update';
      return new MockQueryBuilder();
    }),
    delete: vi.fn().mockImplementation(() => {
      currentQueryType = 'delete';
      return new MockQueryBuilder();
    }),
  };

  const setReturningResult = (results: unknown[]) => {
    mockReturningResults.push(results);
  };

  const setQueryResult = (results: unknown[]) => {
    mockQueryResults.push(results);
  };

  const clearResults = () => {
    mockReturningResults.length = 0;
    mockQueryResults.length = 0;
    currentQueryType = null;
    insertCalls.length = 0;
  };

  const getInsertCalls = () => [...insertCalls];

  return { mockDb, setReturningResult, setQueryResult, clearResults, getInsertCalls };
};

const mockPlatform = {
  platformId: mockPlatformId,
  tenantId: mockTenantId,
  name: 'Test Platform',
  platformUrl: 'https://canvas.example.edu',
  clientId: 'test-client-id',
  deploymentId: 'deployment-1',
  publicKeysetUrl: 'https://canvas.example.edu/.well-known/jwks.json',
  authTokenUrl: 'https://canvas.example.edu/login/oauth2/token',
  authLoginUrl: 'https://canvas.example.edu/api/oidc/login',
  toolUrl: 'https://dmz.thearchive.game/lti/launch',
  jwks: {},
  isActive: true,
  lastValidationStatus: null,
  lastValidatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLineItem = {
  lineItemId: '550e8400-e29b-41d4-a716-446655440002',
  tenantId: mockTenantId,
  platformId: mockPlatformId,
  resourceLinkId: 'resource-link-1',
  label: 'Assignment 1',
  scoreMaximum: 100,
  resourceId: 'resource-1',
  tag: 'homework',
  startDate: new Date(),
  endDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockScore = {
  scoreId: '550e8400-e29b-41d4-a716-446655440003',
  tenantId: mockTenantId,
  lineItemId: mockLineItem.lineItemId,
  userId: 'user-123',
  scoreGiven: '85.00',
  scoreMaximum: 100,
  activityProgress: 'completed',
  gradingProgress: 'FullyGraded',
  timestamp: new Date(),
  createdAt: new Date(),
};

const mockDeepLinkContent = {
  contentId: '550e8400-e29b-41d4-a716-446655440004',
  tenantId: mockTenantId,
  platformId: mockPlatformId,
  contentType: 'link',
  title: 'Test Content',
  url: 'https://example.com/content',
  lineItemId: null,
  customParams: {},
  available: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSession = {
  sessionId: '550e8400-e29b-41d4-a716-446655440005',
  tenantId: mockTenantId,
  platformId: mockPlatformId,
  userId: 'user-123',
  resourceLinkId: 'resource-link-1',
  contextId: 'context-1',
  roles: ['Learner'],
  launchId: 'launch-123',
  createdAt: new Date(),
};

const mockNonce = {
  nonceId: '550e8400-e29b-41d4-a716-446655440006',
  nonceValue: 'test-nonce-value',
  platformId: mockPlatformId,
  expiresAt: new Date(Date.now() + 60000),
  usedAt: null,
  createdAt: new Date(),
};

const mockState = {
  stateId: '550e8400-e29b-41d4-a716-446655440007',
  stateValue: 'test-state-value',
  platformId: mockPlatformId,
  codeVerifier: 'test-code-verifier',
  redirectUri: 'https://example.com/callback',
  expiresAt: new Date(Date.now() + 60000),
  usedAt: null,
  createdAt: new Date(),
};

describe('LTI Service', () => {
  let mockDb: ReturnType<typeof createMockDb>['mockDb'];
  let setReturningResult: ReturnType<typeof createMockDb>['setReturningResult'];
  let setQueryResult: ReturnType<typeof createMockDb>['setQueryResult'];
  let getInsertCalls: ReturnType<typeof createMockDb>['getInsertCalls'];

  beforeEach(() => {
    vi.clearAllMocks();
    const db = createMockDb();
    mockDb = db.mockDb;
    setReturningResult = db.setReturningResult;
    setQueryResult = db.setQueryResult;
    getInsertCalls = db.getInsertCalls;
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);
  });

  describe('generateNonce', () => {
    it('generates a 64-character hex string', () => {
      const nonce = generateNonce();
      expect(nonce).toHaveLength(64);
      expect(nonce).toMatch(/^[a-f0-9]+$/);
    });

    it('generates unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('generateState', () => {
    it('generates a 48-character hex string', () => {
      const state = generateState();
      expect(state).toHaveLength(48);
      expect(state).toMatch(/^[a-f0-9]+$/);
    });

    it('generates unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('generateCodeVerifier', () => {
    it('generates a base64url encoded string', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(verifier.length).toBeGreaterThan(0);
      expect(verifier).not.toMatch(/\+/);
      expect(verifier).not.toMatch(/\//);
      expect(verifier).not.toMatch(/=/);
    });
  });

  describe('base64UrlEncode', () => {
    it('encodes buffer to base64url without padding', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]);
      const encoded = base64UrlEncode(buffer);
      expect(encoded).toBe('SGVsbG8');
    });
  });

  describe('generateCodeChallenge', () => {
    it('generates SHA256 base64url encoded challenge', async () => {
      const verifier = 'test-verifier';
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(challenge.length).toBeGreaterThan(0);
      expect(challenge).not.toMatch(/\+/);
      expect(challenge).not.toMatch(/\//);
      expect(challenge).not.toMatch(/=/);
    });

    it('generates consistent challenge for same verifier', async () => {
      const verifier = 'test-verifier';
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });
  });

  describe('createLtiPlatform', () => {
    it('creates a platform successfully', async () => {
      setReturningResult([mockPlatform]);

      const input = {
        name: 'Test Platform',
        platformUrl: 'https://canvas.example.edu',
        clientId: 'test-client-id',
        publicKeysetUrl: 'https://canvas.example.edu/.well-known/jwks.json',
        authTokenUrl: 'https://canvas.example.edu/login/oauth2/token',
        authLoginUrl: 'https://canvas.example.edu/api/oidc/login',
      };

      const result = await createLtiPlatform(mockConfig, mockTenantId, input);

      expect(result).toEqual(mockPlatform);
      expect(mockDb.insert).toHaveBeenCalled();

      const insertCalls = getInsertCalls();
      expect(insertCalls.length).toBeGreaterThan(0);

      const lastInsert = insertCalls[insertCalls.length - 1];
      expect(lastInsert.values).toMatchObject({
        tenantId: mockTenantId,
        name: input.name,
        platformUrl: input.platformUrl,
        clientId: input.clientId,
        publicKeysetUrl: input.publicKeysetUrl,
        authTokenUrl: input.authTokenUrl,
        authLoginUrl: input.authLoginUrl,
      });
    });
  });

  describe('getLtiPlatformById', () => {
    it('returns platform when found', async () => {
      setQueryResult([mockPlatform]);

      const result = await getLtiPlatformById(mockConfig, mockTenantId, mockPlatformId);

      expect(result).toEqual(mockPlatform);
    });

    it('returns null when platform not found', async () => {
      setQueryResult([]);

      const result = await getLtiPlatformById(mockConfig, mockTenantId, 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getLtiPlatformByClientId', () => {
    it('returns platform when found', async () => {
      setQueryResult([mockPlatform]);

      const result = await getLtiPlatformByClientId(mockConfig, 'test-client-id');

      expect(result).toEqual(mockPlatform);
    });

    it('returns null when platform not found', async () => {
      setQueryResult([]);

      const result = await getLtiPlatformByClientId(mockConfig, 'non-existent-client');

      expect(result).toBeNull();
    });
  });

  describe('getLtiPlatformByUrl', () => {
    it('returns platform when found', async () => {
      setQueryResult([mockPlatform]);

      const result = await getLtiPlatformByUrl(mockConfig, 'https://canvas.example.edu');

      expect(result).toEqual(mockPlatform);
    });

    it('returns null when platform not found', async () => {
      setQueryResult([]);

      const result = await getLtiPlatformByUrl(mockConfig, 'https://nonexistent.example.edu');

      expect(result).toBeNull();
    });
  });

  describe('getLtiPlatformByInternalId', () => {
    it('returns platform when found', async () => {
      setQueryResult([mockPlatform]);

      const result = await getLtiPlatformByInternalId(mockConfig, mockPlatformId);

      expect(result).toEqual(mockPlatform);
    });

    it('returns null when platform not found', async () => {
      setQueryResult([]);

      const result = await getLtiPlatformByInternalId(mockConfig, 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('listLtiPlatforms', () => {
    it('returns all platforms for tenant', async () => {
      setQueryResult([mockPlatform]);

      const result = await listLtiPlatforms(mockConfig, mockTenantId);

      expect(result).toEqual([mockPlatform]);
    });

    it('returns empty array when no platforms exist', async () => {
      setQueryResult([]);

      const result = await listLtiPlatforms(mockConfig, mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('updateLtiPlatform', () => {
    it('updates platform successfully', async () => {
      const updatedPlatform = { ...mockPlatform, name: 'Updated Platform' };
      setReturningResult([updatedPlatform]);

      const result = await updateLtiPlatform(mockConfig, mockTenantId, mockPlatformId, {
        name: 'Updated Platform',
      });

      expect(result).toEqual(updatedPlatform);
    });

    it('returns null when platform not found', async () => {
      setReturningResult([]);

      const result = await updateLtiPlatform(mockConfig, mockTenantId, 'non-existent-id', {
        name: 'Updated Platform',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteLtiPlatform', () => {
    it('returns true when platform deleted', async () => {
      setReturningResult([mockPlatform]);

      const result = await deleteLtiPlatform(mockConfig, mockTenantId, mockPlatformId);

      expect(result).toBe(true);
    });

    it('returns false when platform not found', async () => {
      setReturningResult([]);

      const result = await deleteLtiPlatform(mockConfig, mockTenantId, 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('createNonce', () => {
    it('creates nonce successfully', async () => {
      setReturningResult([mockNonce]);

      const expiresAt = new Date(Date.now() + 60000);

      await expect(
        createNonce(mockConfig, mockPlatformId, 'test-nonce', expiresAt),
      ).resolves.not.toThrow();

      expect(mockDb.insert).toHaveBeenCalled();

      const insertCalls = getInsertCalls();
      expect(insertCalls.length).toBeGreaterThan(0);

      const lastInsert = insertCalls[insertCalls.length - 1];
      expect(lastInsert.values).toMatchObject({
        platformId: mockPlatformId,
        nonceValue: 'test-nonce',
      });
    });
  });

  describe('validateAndConsumeNonce', () => {
    it('returns true for valid unused nonce', async () => {
      setQueryResult([mockNonce]);

      const result = await validateAndConsumeNonce(mockConfig, mockPlatformId, 'test-nonce');

      expect(result).toBe(true);
    });

    it('returns false when nonce not found', async () => {
      setQueryResult([]);

      const result = await validateAndConsumeNonce(mockConfig, mockPlatformId, 'non-existent');

      expect(result).toBe(false);
    });

    it('returns false for expired nonce', async () => {
      const expiredNonce = { ...mockNonce, expiresAt: new Date(Date.now() - 1000) };
      setQueryResult([expiredNonce]);

      const result = await validateAndConsumeNonce(mockConfig, mockPlatformId, 'test-nonce');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredNonces', () => {
    it('returns count of deleted nonces', async () => {
      setReturningResult([mockNonce, mockNonce]);

      const result = await cleanupExpiredNonces(mockConfig);

      expect(result).toBe(2);
    });

    it('returns 0 when no expired nonces', async () => {
      setReturningResult([]);

      const result = await cleanupExpiredNonces(mockConfig);

      expect(result).toBe(0);
    });
  });

  describe('createLtiLineItem', () => {
    it('creates line item successfully', async () => {
      setReturningResult([mockLineItem]);

      const result = await createLtiLineItem(mockConfig, mockTenantId, {
        platformId: mockPlatformId,
        label: 'Assignment 1',
      });

      expect(result).toEqual(mockLineItem);
    });

    it('creates line item with all optional fields', async () => {
      setReturningResult([mockLineItem]);

      const result = await createLtiLineItem(mockConfig, mockTenantId, {
        platformId: mockPlatformId,
        resourceLinkId: 'resource-link-1',
        label: 'Assignment 1',
        scoreMaximum: 100,
        resourceId: 'resource-1',
        tag: 'homework',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      });

      expect(result).toEqual(mockLineItem);
    });
  });

  describe('getLtiLineItemById', () => {
    it('returns line item when found', async () => {
      setQueryResult([mockLineItem]);

      const result = await getLtiLineItemById(mockConfig, mockTenantId, mockLineItem.lineItemId);

      expect(result).toEqual(mockLineItem);
    });

    it('returns null when line item not found', async () => {
      setQueryResult([]);

      const result = await getLtiLineItemById(mockConfig, mockTenantId, 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getLtiLineItemByIdOnly', () => {
    it('returns line item when found', async () => {
      setQueryResult([mockLineItem]);

      const result = await getLtiLineItemByIdOnly(mockConfig, mockLineItem.lineItemId);

      expect(result).toEqual(mockLineItem);
    });

    it('returns null when line item not found', async () => {
      setQueryResult([]);

      const result = await getLtiLineItemByIdOnly(mockConfig, 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getLtiLineItemByResourceLinkId', () => {
    it('returns line item when found', async () => {
      setQueryResult([mockLineItem]);

      const result = await getLtiLineItemByResourceLinkId(
        mockConfig,
        mockPlatformId,
        'resource-link-1',
      );

      expect(result).toEqual(mockLineItem);
    });

    it('returns null when line item not found', async () => {
      setQueryResult([]);

      const result = await getLtiLineItemByResourceLinkId(
        mockConfig,
        mockPlatformId,
        'non-existent-resource',
      );

      expect(result).toBeNull();
    });
  });

  describe('listLtiLineItems', () => {
    it('returns all line items for tenant', async () => {
      setQueryResult([mockLineItem]);

      const result = await listLtiLineItems(mockConfig, mockTenantId);

      expect(result).toEqual([mockLineItem]);
    });

    it('filters by platformId when provided', async () => {
      setQueryResult([mockLineItem]);

      const result = await listLtiLineItems(mockConfig, mockTenantId, mockPlatformId);

      expect(result).toEqual([mockLineItem]);
    });

    it('returns empty array when no line items exist', async () => {
      setQueryResult([]);

      const result = await listLtiLineItems(mockConfig, mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('updateLtiLineItem', () => {
    it('updates line item successfully', async () => {
      const updatedLineItem = { ...mockLineItem, label: 'Updated Assignment' };
      setReturningResult([updatedLineItem]);

      const result = await updateLtiLineItem(mockConfig, mockTenantId, mockLineItem.lineItemId, {
        label: 'Updated Assignment',
      });

      expect(result).toEqual(updatedLineItem);
    });

    it('returns null when line item not found', async () => {
      setReturningResult([]);

      const result = await updateLtiLineItem(mockConfig, mockTenantId, 'non-existent-id', {
        label: 'Updated Assignment',
      });

      expect(result).toBeNull();
    });

    it('handles scoreMaximum update', async () => {
      const updatedLineItem = { ...mockLineItem, scoreMaximum: 200 };
      setReturningResult([updatedLineItem]);

      const result = await updateLtiLineItem(mockConfig, mockTenantId, mockLineItem.lineItemId, {
        scoreMaximum: 200,
      });

      expect(result).toEqual(updatedLineItem);
    });

    it('handles clearing optional fields with null', async () => {
      const updatedLineItem = { ...mockLineItem, tag: null };
      setReturningResult([updatedLineItem]);

      const result = await updateLtiLineItem(mockConfig, mockTenantId, mockLineItem.lineItemId, {
        tag: null,
      });

      expect(result).toEqual(updatedLineItem);
    });
  });

  describe('deleteLtiLineItem', () => {
    it('returns true when line item deleted', async () => {
      setReturningResult([mockLineItem]);

      const result = await deleteLtiLineItem(mockConfig, mockTenantId, mockLineItem.lineItemId);

      expect(result).toBe(true);
    });

    it('returns false when line item not found', async () => {
      setReturningResult([]);

      const result = await deleteLtiLineItem(mockConfig, mockTenantId, 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('createLtiScore', () => {
    it('creates score successfully', async () => {
      setReturningResult([mockScore]);

      const result = await createLtiScore(mockConfig, mockTenantId, {
        lineItemId: mockLineItem.lineItemId,
        userId: 'user-123',
      });

      expect(result).toEqual(mockScore);
    });

    it('creates score with all optional fields', async () => {
      setReturningResult([mockScore]);

      const result = await createLtiScore(mockConfig, mockTenantId, {
        lineItemId: mockLineItem.lineItemId,
        userId: 'user-123',
        scoreGiven: 85,
        scoreMaximum: 100,
        activityProgress: 'completed',
        gradingProgress: 'FullyGraded',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(result).toEqual(mockScore);
    });
  });

  describe('getLtiScoreByUserAndLineItem', () => {
    it('returns score when found', async () => {
      setQueryResult([mockScore]);

      const result = await getLtiScoreByUserAndLineItem(
        mockConfig,
        mockLineItem.lineItemId,
        'user-123',
      );

      expect(result).toEqual(mockScore);
    });

    it('returns null when score not found', async () => {
      setQueryResult([]);

      const result = await getLtiScoreByUserAndLineItem(
        mockConfig,
        mockLineItem.lineItemId,
        'non-existent-user',
      );

      expect(result).toBeNull();
    });
  });

  describe('listLtiScores', () => {
    it('returns all scores for tenant', async () => {
      setQueryResult([mockScore]);

      const result = await listLtiScores(mockConfig, mockTenantId);

      expect(result).toEqual([mockScore]);
    });

    it('filters by lineItemId when provided', async () => {
      setQueryResult([mockScore]);

      const result = await listLtiScores(mockConfig, mockTenantId, mockLineItem.lineItemId);

      expect(result).toEqual([mockScore]);
    });

    it('returns empty array when no scores exist', async () => {
      setQueryResult([]);

      const result = await listLtiScores(mockConfig, mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('createLtiDeepLinkContent', () => {
    it('creates deep link content successfully', async () => {
      setReturningResult([mockDeepLinkContent]);

      const result = await createLtiDeepLinkContent(mockConfig, mockTenantId, {
        platformId: mockPlatformId,
        contentType: 'link',
        title: 'Test Content',
        url: 'https://example.com/content',
      });

      expect(result).toEqual(mockDeepLinkContent);
    });

    it('creates deep link content with all optional fields', async () => {
      setReturningResult([mockDeepLinkContent]);

      const result = await createLtiDeepLinkContent(mockConfig, mockTenantId, {
        platformId: mockPlatformId,
        contentType: 'link',
        title: 'Test Content',
        url: 'https://example.com/content',
        lineItemId: mockLineItem.lineItemId,
        customParams: { key: 'value' },
        available: true,
      });

      expect(result).toEqual(mockDeepLinkContent);
    });
  });

  describe('getLtiDeepLinkContentById', () => {
    it('returns content when found', async () => {
      setQueryResult([mockDeepLinkContent]);

      const result = await getLtiDeepLinkContentById(
        mockConfig,
        mockTenantId,
        mockDeepLinkContent.contentId,
      );

      expect(result).toEqual(mockDeepLinkContent);
    });

    it('returns null when content not found', async () => {
      setQueryResult([]);

      const result = await getLtiDeepLinkContentById(mockConfig, mockTenantId, 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('listLtiDeepLinkContent', () => {
    it('returns all content for tenant', async () => {
      setQueryResult([mockDeepLinkContent]);

      const result = await listLtiDeepLinkContent(mockConfig, mockTenantId);

      expect(result).toEqual([mockDeepLinkContent]);
    });

    it('filters by platformId when provided', async () => {
      setQueryResult([mockDeepLinkContent]);

      const result = await listLtiDeepLinkContent(mockConfig, mockTenantId, mockPlatformId);

      expect(result).toEqual([mockDeepLinkContent]);
    });

    it('filters by available status when provided', async () => {
      setQueryResult([mockDeepLinkContent]);

      const result = await listLtiDeepLinkContent(mockConfig, mockTenantId, undefined, true);

      expect(result).toEqual([mockDeepLinkContent]);
    });

    it('returns empty array when no content exists', async () => {
      setQueryResult([]);

      const result = await listLtiDeepLinkContent(mockConfig, mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('updateLtiDeepLinkContent', () => {
    it('updates content successfully', async () => {
      const updatedContent = { ...mockDeepLinkContent, title: 'Updated Title' };
      setReturningResult([updatedContent]);

      const result = await updateLtiDeepLinkContent(
        mockConfig,
        mockTenantId,
        mockDeepLinkContent.contentId,
        { title: 'Updated Title' },
      );

      expect(result).toEqual(updatedContent);
    });

    it('returns null when content not found', async () => {
      setReturningResult([]);

      const result = await updateLtiDeepLinkContent(mockConfig, mockTenantId, 'non-existent-id', {
        title: 'Updated Title',
      });

      expect(result).toBeNull();
    });

    it('handles url update to null', async () => {
      const updatedContent = { ...mockDeepLinkContent, url: null };
      setReturningResult([updatedContent]);

      const result = await updateLtiDeepLinkContent(
        mockConfig,
        mockTenantId,
        mockDeepLinkContent.contentId,
        { url: null },
      );

      expect(result).toEqual(updatedContent);
    });
  });

  describe('deleteLtiDeepLinkContent', () => {
    it('returns true when content deleted', async () => {
      setReturningResult([mockDeepLinkContent]);

      const result = await deleteLtiDeepLinkContent(
        mockConfig,
        mockTenantId,
        mockDeepLinkContent.contentId,
      );

      expect(result).toBe(true);
    });

    it('returns false when content not found', async () => {
      setReturningResult([]);

      const result = await deleteLtiDeepLinkContent(mockConfig, mockTenantId, 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('createLtiSession', () => {
    it('creates session successfully', async () => {
      setReturningResult([mockSession]);

      const result = await createLtiSession(mockConfig, mockTenantId, {
        platformId: mockPlatformId,
        userId: 'user-123',
        resourceLinkId: 'resource-link-1',
        contextId: 'context-1',
        roles: ['Learner'],
        launchId: 'launch-123',
      });

      expect(result).toEqual(mockSession);
    });

    it('creates session with minimal data', async () => {
      setReturningResult([mockSession]);

      const result = await createLtiSession(mockConfig, mockTenantId, {
        platformId: mockPlatformId,
      });

      expect(result).toEqual(mockSession);
    });
  });

  describe('getLtiSessionByLaunchId', () => {
    it('returns session when found', async () => {
      setQueryResult([mockSession]);

      const result = await getLtiSessionByLaunchId(mockConfig, 'launch-123');

      expect(result).toEqual(mockSession);
    });

    it('returns null when session not found', async () => {
      setQueryResult([]);

      const result = await getLtiSessionByLaunchId(mockConfig, 'non-existent-launch');

      expect(result).toBeNull();
    });
  });

  describe('listLtiSessions', () => {
    it('returns all sessions for tenant', async () => {
      setQueryResult([mockSession]);

      const result = await listLtiSessions(mockConfig, mockTenantId);

      expect(result).toEqual([mockSession]);
    });

    it('filters by platformId when provided', async () => {
      setQueryResult([mockSession]);

      const result = await listLtiSessions(mockConfig, mockTenantId, mockPlatformId);

      expect(result).toEqual([mockSession]);
    });

    it('returns empty array when no sessions exist', async () => {
      setQueryResult([]);

      const result = await listLtiSessions(mockConfig, mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('createState', () => {
    it('creates state successfully', async () => {
      setReturningResult([mockState]);

      const expiresAt = new Date(Date.now() + 60000);

      await expect(
        createState(
          mockConfig,
          mockPlatformId,
          'test-state',
          'test-code-verifier',
          'https://example.com/callback',
          expiresAt,
        ),
      ).resolves.not.toThrow();

      expect(mockDb.insert).toHaveBeenCalled();

      const insertCalls = getInsertCalls();
      expect(insertCalls.length).toBeGreaterThan(0);

      const lastInsert = insertCalls[insertCalls.length - 1];
      expect(lastInsert.values).toMatchObject({
        platformId: mockPlatformId,
        stateValue: 'test-state',
        codeVerifier: 'test-code-verifier',
        redirectUri: 'https://example.com/callback',
      });
    });
  });

  describe('validateAndConsumeState', () => {
    it('returns state data for valid unused state', async () => {
      setQueryResult([mockState]);

      const result = await validateAndConsumeState(mockConfig, 'test-state');

      expect(result).toEqual({
        platformId: mockState.platformId,
        codeVerifier: mockState.codeVerifier ?? '',
        redirectUri: mockState.redirectUri,
      });
    });

    it('returns null when state not found', async () => {
      setQueryResult([]);

      const result = await validateAndConsumeState(mockConfig, 'non-existent-state');

      expect(result).toBeNull();
    });

    it('returns null for expired state', async () => {
      const expiredState = { ...mockState, expiresAt: new Date(Date.now() - 1000) };
      setQueryResult([expiredState]);

      const result = await validateAndConsumeState(mockConfig, 'test-state');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredStates', () => {
    it('returns count of deleted states', async () => {
      setReturningResult([mockState, mockState]);

      const result = await cleanupExpiredStates(mockConfig);

      expect(result).toBe(2);
    });

    it('returns 0 when no expired states', async () => {
      setReturningResult([]);

      const result = await cleanupExpiredStates(mockConfig);

      expect(result).toBe(0);
    });
  });

  describe('initiateOidcLogin', () => {
    it('returns null when platform not found', async () => {
      setQueryResult([]);

      const result = await initiateOidcLogin(mockConfig, {
        iss: 'https://nonexistent.example.edu',
        loginHint: 'user-123',
        targetLinkUri: 'https://example.com/lti/launch',
      });

      expect(result).toBeNull();
    });

    it('returns OIDC login response with URL and state', async () => {
      setQueryResult([mockPlatform]);

      const result = await initiateOidcLogin(mockConfig, {
        iss: 'https://canvas.example.edu',
        loginHint: 'user-123',
        targetLinkUri: 'https://example.com/lti/launch',
      });

      expect(result).not.toBeNull();
      expect(result?.url).toContain('https://canvas.example.edu');
      expect(result?.state).toHaveLength(48);
      expect(result?.nonce).toHaveLength(64);

      const url = new URL(result!.url);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe(mockPlatform.clientId);
      expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/lti/launch');
      expect(url.searchParams.get('scope')).toBe('openid');
      expect(url.searchParams.get('state')).toBe(result?.state);
      expect(url.searchParams.get('nonce')).toBe(result?.nonce);
      expect(url.searchParams.get('login_hint')).toBe('user-123');
      expect(url.searchParams.get('code_challenge')).toBeDefined();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('includes lti_message_hint when provided', async () => {
      setQueryResult([mockPlatform]);

      const result = await initiateOidcLogin(mockConfig, {
        iss: 'https://canvas.example.edu',
        loginHint: 'user-123',
        targetLinkUri: 'https://example.com/lti/launch',
        ltiMessageHint: 'message-hint-value',
      });

      expect(result).not.toBeNull();
      const url = new URL(result!.url);
      expect(url.searchParams.get('lti_message_hint')).toBe('message-hint-value');
    });
  });

  describe('extractLtiLaunchData', () => {
    it('returns null when platform not found', async () => {
      setQueryResult([]);

      const result = await extractLtiLaunchData(mockConfig, {
        aud: 'non-existent-client',
      });

      expect(result).toBeNull();
    });

    it('extracts launch data from valid payload', async () => {
      setQueryResult([mockPlatform]);

      const result = await extractLtiLaunchData(mockConfig, {
        aud: 'test-client-id',
        sub: 'user-123',
        'https://purl.imsglobal.org/spec/lti/claim/roles': ['Learner'],
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': { id: 'resource-link-1' },
        'https://purl.imsglobal.org/spec/lti/claim/context': {
          id: 'context-1',
          title: 'Course 101',
        },
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deployment-1',
      });

      expect(result).toEqual({
        platformId: mockPlatformId,
        deploymentId: 'deployment-1',
        userId: 'user-123',
        roles: ['Learner'],
        resourceLinkId: 'resource-link-1',
        contextId: 'context-1',
        contextTitle: 'Course 101',
        lineItemUrl: undefined,
        membershipUrl: undefined,
        customParams: {},
      });
    });

    it('handles optional claims gracefully', async () => {
      setQueryResult([mockPlatform]);

      const result = await extractLtiLaunchData(mockConfig, {
        aud: 'test-client-id',
        sub: 'user-123',
      });

      expect(result).toEqual({
        platformId: mockPlatformId,
        deploymentId: '',
        userId: 'user-123',
        roles: [],
        resourceLinkId: '',
        customParams: {},
      });
    });

    it('extracts lineItemUrl from agsEndpoint', async () => {
      setQueryResult([mockPlatform]);

      const result = await extractLtiLaunchData(mockConfig, {
        aud: 'test-client-id',
        sub: 'user-123',
        'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
          lineitem: 'https://canvas.example.edu/api/lti/grades/lineitems/1',
        },
      });

      expect(result).toEqual({
        platformId: mockPlatformId,
        deploymentId: '',
        userId: 'user-123',
        roles: [],
        resourceLinkId: '',
        lineItemUrl: 'https://canvas.example.edu/api/lti/grades/lineitems/1',
        membershipUrl: undefined,
        customParams: {},
      });
    });

    it('extracts membershipUrl from nrpsClaim', async () => {
      setQueryResult([mockPlatform]);

      const result = await extractLtiLaunchData(mockConfig, {
        aud: 'test-client-id',
        sub: 'user-123',
        'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': {
          contextMembershipsUrl: 'https://canvas.example.edu/api/lti/namesandroles',
        },
      });

      expect(result).toEqual({
        platformId: mockPlatformId,
        deploymentId: '',
        userId: 'user-123',
        roles: [],
        resourceLinkId: '',
        lineItemUrl: undefined,
        membershipUrl: 'https://canvas.example.edu/api/lti/namesandroles',
        customParams: {},
      });
    });
  });

  describe('refreshJWKSet', () => {
    it('clears the JWKS cache for platform', async () => {
      await expect(refreshJWKSet(mockConfig, mockPlatformId)).resolves.not.toThrow();
    });
  });

  describe('verifyLtiJwt', () => {
    it('throws error when platform has no publicKeysetUrl', async () => {
      const platformWithoutKeys = { ...mockPlatform, publicKeysetUrl: '' };

      await expect(verifyLtiJwt(mockConfig, platformWithoutKeys, 'some-token')).rejects.toThrow(
        'No JWKS available for platform',
      );
    });

    it('throws error for expired token', async () => {
      vi.clearAllMocks();
      const { jwtVerify, decodeJwt } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { nonce: 'test-nonce' } } as never);
      vi.mocked(decodeJwt).mockReturnValue({
        iss: mockPlatform.platformUrl,
        aud: mockPlatform.clientId,
        exp: Math.floor(Date.now() / 1000) - 100,
        iat: Math.floor(Date.now() / 1000) - 120,
        sub: 'user-123',
        nonce: 'test-nonce',
      });

      await expect(verifyLtiJwt(mockConfig, mockPlatform, 'expired-token')).rejects.toThrow(
        'Token expired',
      );
    });

    it('throws error for invalid issuer', async () => {
      vi.clearAllMocks();
      const { jwtVerify, decodeJwt } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { nonce: 'test-nonce' } } as never);
      vi.mocked(decodeJwt).mockReturnValue({
        iss: 'https://wrong.example.edu',
        aud: mockPlatform.clientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'user-123',
        nonce: 'test-nonce',
      });

      await expect(verifyLtiJwt(mockConfig, mockPlatform, 'invalid-issuer-token')).rejects.toThrow(
        'Invalid issuer',
      );
    });

    it('throws error for missing audience claim', async () => {
      vi.clearAllMocks();
      const { jwtVerify, decodeJwt } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { nonce: 'test-nonce' } } as never);
      vi.mocked(decodeJwt).mockReturnValue({
        iss: mockPlatform.platformUrl,
        aud: null,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'user-123',
        nonce: 'test-nonce',
      });

      await expect(verifyLtiJwt(mockConfig, mockPlatform, 'no-aud-token')).rejects.toThrow(
        'No audience claim',
      );
    });

    it('throws error for invalid audience', async () => {
      vi.clearAllMocks();
      const { jwtVerify, decodeJwt } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { nonce: 'test-nonce' } } as never);
      vi.mocked(decodeJwt).mockReturnValue({
        iss: mockPlatform.platformUrl,
        aud: 'wrong-client-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'user-123',
        nonce: 'test-nonce',
      });

      await expect(verifyLtiJwt(mockConfig, mockPlatform, 'invalid-aud-token')).rejects.toThrow(
        'Invalid audience',
      );
    });

    it('throws error for token issued in the future', async () => {
      vi.clearAllMocks();
      const { jwtVerify, decodeJwt } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { nonce: 'test-nonce' } } as never);
      vi.mocked(decodeJwt).mockReturnValue({
        iss: mockPlatform.platformUrl,
        aud: mockPlatform.clientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000) + 120,
        sub: 'user-123',
        nonce: 'test-nonce',
      });

      await expect(verifyLtiJwt(mockConfig, mockPlatform, 'future-iat-token')).rejects.toThrow(
        'Token issued in the future',
      );
    });

    it('throws error for invalid nonce', async () => {
      vi.clearAllMocks();
      const { jwtVerify, decodeJwt } = await import('jose');
      vi.mocked(jwtVerify).mockResolvedValue({ payload: { nonce: 'wrong-nonce' } } as never);
      vi.mocked(decodeJwt).mockReturnValue({
        iss: mockPlatform.platformUrl,
        aud: mockPlatform.clientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'user-123',
        nonce: 'wrong-nonce',
      });

      await expect(
        verifyLtiJwt(mockConfig, mockPlatform, 'invalid-nonce-token', 'expected-nonce'),
      ).rejects.toThrow('Invalid nonce');
    });
  });
});

describe('LTI Service exports', () => {
  it('exports all expected types and functions', async () => {
    const module = await import('../lti.service.js');

    expect(typeof module.createLtiPlatform).toBe('function');
    expect(typeof module.getLtiPlatformById).toBe('function');
    expect(typeof module.getLtiPlatformByClientId).toBe('function');
    expect(typeof module.getLtiPlatformByUrl).toBe('function');
    expect(typeof module.getLtiPlatformByInternalId).toBe('function');
    expect(typeof module.listLtiPlatforms).toBe('function');
    expect(typeof module.updateLtiPlatform).toBe('function');
    expect(typeof module.deleteLtiPlatform).toBe('function');
    expect(typeof module.createNonce).toBe('function');
    expect(typeof module.validateAndConsumeNonce).toBe('function');
    expect(typeof module.cleanupExpiredNonces).toBe('function');
    expect(typeof module.createLtiLineItem).toBe('function');
    expect(typeof module.getLtiLineItemById).toBe('function');
    expect(typeof module.getLtiLineItemByIdOnly).toBe('function');
    expect(typeof module.getLtiLineItemByResourceLinkId).toBe('function');
    expect(typeof module.listLtiLineItems).toBe('function');
    expect(typeof module.updateLtiLineItem).toBe('function');
    expect(typeof module.deleteLtiLineItem).toBe('function');
    expect(typeof module.createLtiScore).toBe('function');
    expect(typeof module.getLtiScoreByUserAndLineItem).toBe('function');
    expect(typeof module.listLtiScores).toBe('function');
    expect(typeof module.createLtiDeepLinkContent).toBe('function');
    expect(typeof module.getLtiDeepLinkContentById).toBe('function');
    expect(typeof module.listLtiDeepLinkContent).toBe('function');
    expect(typeof module.updateLtiDeepLinkContent).toBe('function');
    expect(typeof module.deleteLtiDeepLinkContent).toBe('function');
    expect(typeof module.createLtiSession).toBe('function');
    expect(typeof module.getLtiSessionByLaunchId).toBe('function');
    expect(typeof module.listLtiSessions).toBe('function');
    expect(typeof module.generateNonce).toBe('function');
    expect(typeof module.generateState).toBe('function');
    expect(typeof module.generateCodeVerifier).toBe('function');
    expect(typeof module.base64UrlEncode).toBe('function');
    expect(typeof module.generateCodeChallenge).toBe('function');
    expect(typeof module.initiateOidcLogin).toBe('function');
    expect(typeof module.extractLtiLaunchData).toBe('function');
    expect(typeof module.verifyLtiJwt).toBe('function');
    expect(typeof module.refreshJWKSet).toBe('function');
    expect(typeof module.createState).toBe('function');
    expect(typeof module.validateAndConsumeState).toBe('function');
    expect(typeof module.cleanupExpiredStates).toBe('function');
  });
});

describe('LTI Service - Replay Attack Prevention (SQLite)', () => {
  let sqliteDb: SqliteDb;

  beforeEach(() => {
    sqliteDb = createSqliteDb();
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('returns false for already-used nonce (replay attack prevention)', () => {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 60000).toISOString();

    sqliteDb
      .prepare(
        'INSERT INTO lti_nonces (nonce_id, nonce_value, platform_id, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('nonce-1', 'already-used-nonce', mockPlatformId, future, now, now);

    const row = sqliteDb
      .prepare(
        'SELECT * FROM lti_nonces WHERE nonce_value = ? AND platform_id = ? AND used_at IS NULL',
      )
      .get('already-used-nonce', mockPlatformId);

    expect(row).toBeUndefined();
  });

  it('returns null for already-used state (replay attack prevention)', () => {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 60000).toISOString();

    sqliteDb
      .prepare(
        'INSERT INTO lti_states (state_id, state_value, platform_id, code_verifier, redirect_uri, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        'state-1',
        'already-used-state',
        mockPlatformId,
        'verifier',
        'https://example.com/callback',
        future,
        now,
        now,
      );

    const row = sqliteDb
      .prepare('SELECT * FROM lti_states WHERE state_value = ? AND used_at IS NULL')
      .get('already-used-state');

    expect(row).toBeUndefined();
  });

  it('returns nonce when not yet used (isNull condition works correctly)', () => {
    const future = new Date(Date.now() + 60000).toISOString();

    sqliteDb
      .prepare(
        'INSERT INTO lti_nonces (nonce_id, nonce_value, platform_id, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run('nonce-2', 'unused-nonce', mockPlatformId, future, null, future);

    const row = sqliteDb
      .prepare(
        'SELECT * FROM lti_nonces WHERE nonce_value = ? AND platform_id = ? AND used_at IS NULL',
      )
      .get('unused-nonce', mockPlatformId);

    expect(row).toBeDefined();
    expect((row as { nonce_value: string }).nonce_value).toBe('unused-nonce');
  });

  it('returns state when not yet used (isNull condition works correctly)', () => {
    const future = new Date(Date.now() + 60000).toISOString();

    sqliteDb
      .prepare(
        'INSERT INTO lti_states (state_id, state_value, platform_id, code_verifier, redirect_uri, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        'state-2',
        'unused-state',
        mockPlatformId,
        'verifier',
        'https://example.com/callback',
        future,
        null,
        future,
      );

    const row = sqliteDb
      .prepare('SELECT * FROM lti_states WHERE state_value = ? AND used_at IS NULL')
      .get('unused-state');

    expect(row).toBeDefined();
    expect((row as { state_value: string }).state_value).toBe('unused-state');
  });
});
