import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  isValidConsentType,
  getRequiredConsentTypes,
  grantConsent,
  revokeConsent,
  checkConsent,
  type ConsentType,
} from '../consent.service.js';
import { CONSENT_FEATURE_MAP } from '../../../db/schema/social/player-consent.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import type { AppConfig } from '../../../config.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

const mockConfig = {
  tenantId: 'tenant-123',
  seasonId: 'season-123',
} as unknown as AppConfig;

const createMockDb = () => {
  const mockQueryResults: Map<string, unknown> = new Map();
  const mockInsertResults: Map<string, unknown[]> = new Map();
  const mockUpdateResults: Map<string, unknown[]> = new Map();

  const mockDb = {
    query: {
      playerConsents: {
        findFirst: vi.fn().mockImplementation(async () => {
          const key = 'playerConsents.findFirst';
          return mockQueryResults.get(key) ?? null;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          const key = 'playerConsents.findMany';
          return mockQueryResults.get(key) ?? [];
        }),
      },
      tenantPrivacySettings: {
        findFirst: vi.fn().mockImplementation(async () => {
          const key = 'tenantPrivacySettings.findFirst';
          return mockQueryResults.get(key) ?? null;
        }),
      },
    },
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(async () => {
      const key = 'insert.returning';
      return mockUpdateResults.get(key) ?? [];
    }),
    where: vi.fn().mockReturnThis(),
  };

  const setQueryResult = (key: string, result: unknown) => {
    mockQueryResults.set(key, result);
  };

  const setInsertResult = (key: string, result: unknown[]) => {
    mockInsertResults.set(key, result);
  };

  const setUpdateResult = (key: string, result: unknown[]) => {
    mockUpdateResults.set(key, result);
  };

  return { mockDb, setQueryResult, setInsertResult, setUpdateResult, mockQueryResults };
};

describe('consent service - constants', () => {
  it('should have all required consent types', () => {
    const expectedTypes = [
      'social_features',
      'public_profile',
      'leaderboard_public',
      'data_processing',
    ];
    expectedTypes.forEach((type) => {
      expect(isValidConsentType(type)).toBe(true);
    });
  });

  it('should reject invalid consent types', () => {
    expect(isValidConsentType('invalid_type')).toBe(false);
    expect(isValidConsentType('')).toBe(false);
  });

  it('should have CONSENT_FEATURE_MAP with all required features', () => {
    expect(CONSENT_FEATURE_MAP).toHaveProperty('add_friends');
    expect(CONSENT_FEATURE_MAP).toHaveProperty('set_profile_public');
    expect(CONSENT_FEATURE_MAP).toHaveProperty('public_leaderboard');
    expect(CONSENT_FEATURE_MAP).toHaveProperty('data_processing');
  });
});

describe('consent service - getRequiredConsentTypes', () => {
  it('should return social_features for add_friends', () => {
    const result = getRequiredConsentTypes('add_friends');
    expect(result).toContain('social_features');
  });

  it('should return public_profile for set_profile_public', () => {
    const result = getRequiredConsentTypes('set_profile_public');
    expect(result).toContain('public_profile');
  });

  it('should return leaderboard_public for public_leaderboard', () => {
    const result = getRequiredConsentTypes('public_leaderboard');
    expect(result).toContain('leaderboard_public');
  });

  it('should return data_processing for data_processing feature', () => {
    const result = getRequiredConsentTypes('data_processing');
    expect(result).toContain('data_processing');
  });

  it('should return empty array for unknown feature', () => {
    const result = getRequiredConsentTypes('unknown_feature');
    expect(result).toEqual([]);
  });
});

describe('consent service - grantConsent validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject invalid consent type', async () => {
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await grantConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'invalid_type' as ConsentType,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid consent type');
  });

  it('should create new consent record when none exists', async () => {
    const { mockDb, setQueryResult, setUpdateResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('playerConsents.findFirst', null);

    setUpdateResult('insert.returning', [
      {
        id: 'consent-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        consentType: 'social_features',
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
      },
    ]);

    const result = await grantConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'social_features',
    });

    expect(result.success).toBe(true);
    expect(result.consent).toBeDefined();
    expect(result.consent?.granted).toBe(true);
  });

  it('should reject when consent already granted', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('playerConsents.findFirst', {
      id: 'consent-1',
      playerId: 'player-1',
      tenantId: 'tenant-123',
      consentType: 'social_features',
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
    });

    const result = await grantConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'social_features',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Consent already granted');
  });

  it('should re-grant previously revoked consent', async () => {
    const { mockDb, setQueryResult, setUpdateResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('playerConsents.findFirst', {
      id: 'consent-1',
      playerId: 'player-1',
      tenantId: 'tenant-123',
      consentType: 'social_features',
      granted: false,
      grantedAt: new Date(),
      revokedAt: new Date(),
    });

    setUpdateResult('insert.returning', [
      {
        id: 'consent-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        consentType: 'social_features',
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
      },
    ]);

    const result = await grantConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'social_features',
    });

    expect(result.success).toBe(true);
    expect(result.consent?.granted).toBe(true);
    expect(result.consent?.revokedAt).toBeNull();
  });
});

describe('consent service - revokeConsent validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject invalid consent type', async () => {
    const { mockDb } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    const result = await revokeConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'invalid_type' as ConsentType,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid consent type');
  });

  it('should return error when consent record not found', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('playerConsents.findFirst', null);

    const result = await revokeConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'social_features',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Consent record not found');
  });

  it('should return error when consent already revoked', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('playerConsents.findFirst', {
      id: 'consent-1',
      playerId: 'player-1',
      tenantId: 'tenant-123',
      consentType: 'social_features',
      granted: false,
      grantedAt: new Date(),
      revokedAt: new Date(),
    });

    const result = await revokeConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'social_features',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Consent not currently granted');
  });

  it('should successfully revoke consent', async () => {
    const { mockDb, setQueryResult, setUpdateResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('playerConsents.findFirst', {
      id: 'consent-1',
      playerId: 'player-1',
      tenantId: 'tenant-123',
      consentType: 'social_features',
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
    });

    setUpdateResult('insert.returning', [
      {
        id: 'consent-1',
        playerId: 'player-1',
        tenantId: 'tenant-123',
        consentType: 'social_features',
        granted: false,
        grantedAt: new Date(),
        revokedAt: new Date(),
      },
    ]);

    const result = await revokeConsent(mockConfig, 'tenant-123', {
      playerId: 'player-1',
      consentType: 'social_features',
    });

    expect(result.success).toBe(true);
    expect(result.consent?.granted).toBe(false);
    expect(result.consent?.revokedAt).toBeDefined();
  });
});

describe('consent service - checkConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return hasConsent false when no consent record exists', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('tenantPrivacySettings.findFirst', {
      tenantId: 'tenant-123',
      requireConsentForSocialFeatures: true,
    });
    setQueryResult('playerConsents.findFirst', null);

    const result = await checkConsent(mockConfig, 'tenant-123', 'player-1', 'social_features');

    expect(result.hasConsent).toBe(false);
    expect(result.tenantRequiresConsent).toBe(true);
  });

  it('should return hasConsent true when valid consent exists', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('tenantPrivacySettings.findFirst', {
      tenantId: 'tenant-123',
      requireConsentForSocialFeatures: true,
    });
    setQueryResult('playerConsents.findFirst', {
      id: 'consent-1',
      playerId: 'player-1',
      tenantId: 'tenant-123',
      consentType: 'social_features',
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
    });

    const result = await checkConsent(mockConfig, 'tenant-123', 'player-1', 'social_features');

    expect(result.hasConsent).toBe(true);
    expect(result.tenantRequiresConsent).toBe(true);
  });

  it('should return hasConsent false when consent is revoked', async () => {
    const { mockDb, setQueryResult } = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as DatabaseClient);

    setQueryResult('tenantPrivacySettings.findFirst', {
      tenantId: 'tenant-123',
      requireConsentForSocialFeatures: true,
    });
    setQueryResult('playerConsents.findFirst', {
      id: 'consent-1',
      playerId: 'player-1',
      tenantId: 'tenant-123',
      consentType: 'social_features',
      granted: false,
      grantedAt: new Date(),
      revokedAt: new Date(),
    });

    const result = await checkConsent(mockConfig, 'tenant-123', 'player-1', 'social_features');

    expect(result.hasConsent).toBe(false);
  });
});
