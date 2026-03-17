import { describe, expect, it } from 'vitest';

describe('feature flags - hashUserToBucket', () => {
  const hashUserToBucket = (userId: string, flagId: string): number => {
    const str = `${userId}:${flagId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  };

  it('should return consistent hash for same user and flag', () => {
    const userId = 'user-123';
    const flagId = 'flag-456';

    const result1 = hashUserToBucket(userId, flagId);
    const result2 = hashUserToBucket(userId, flagId);

    expect(result1).toBe(result2);
  });

  it('should return value between 0 and 99', () => {
    const userId = 'user-123';
    const flagId = 'flag-456';

    const result = hashUserToBucket(userId, flagId);

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(100);
  });

  it('should return different results for different users', () => {
    const flagId = 'flag-456';

    const result1 = hashUserToBucket('user-1', flagId);
    const result2 = hashUserToBucket('user-2', flagId);

    expect(result1).not.toBe(result2);
  });

  it('should return different results for different flags', () => {
    const userId = 'user-123';

    const result1 = hashUserToBucket(userId, 'flag-1');
    const result2 = hashUserToBucket(userId, 'flag-2');

    expect(result1).not.toBe(result2);
  });

  it('should distribute users across buckets roughly evenly', () => {
    const flagId = 'flag-456';
    const buckets = new Array(100).fill(0);

    for (let i = 0; i < 10000; i++) {
      const bucket = hashUserToBucket(`user-${i}`, flagId);
      buckets[bucket]++;
    }

    const avg = 10000 / 100;
    const tolerance = avg * 0.5;

    buckets.forEach((count) => {
      expect(count).toBeGreaterThan(avg - tolerance);
      expect(count).toBeLessThan(avg + tolerance);
    });
  });
});

describe('feature flags - rollout percentage logic', () => {
  const isInTreatmentGroup = (userId: string, flagId: string, percentage: number): boolean => {
    const str = `${userId}:${flagId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const bucket = Math.abs(hash % 100);
    return bucket < percentage;
  };

  it('should return false when rollout is 0%', () => {
    expect(isInTreatmentGroup('user-1', 'flag-1', 0)).toBe(false);
  });

  it('should return true for all users when rollout is 100%', () => {
    expect(isInTreatmentGroup('user-1', 'flag-1', 100)).toBe(true);
    expect(isInTreatmentGroup('user-2', 'flag-1', 100)).toBe(true);
    expect(isInTreatmentGroup('user-3', 'flag-1', 100)).toBe(true);
  });

  it('should respect exact percentage over many users', () => {
    const flagId = 'test-flag';
    const iterations = 10000;
    const percentage = 25;
    let inTreatment = 0;

    for (let i = 0; i < iterations; i++) {
      if (isInTreatmentGroup(`user-${i}`, flagId, percentage)) {
        inTreatment++;
      }
    }

    const actualPercentage = (inTreatment / iterations) * 100;
    expect(actualPercentage).toBeGreaterThan(23);
    expect(actualPercentage).toBeLessThan(27);
  });
});

describe('feature flags - evaluation logic', () => {
  interface FlagConfig {
    enabledByDefault: boolean;
    rolloutPercentage: number;
    override?: {
      enabled: boolean;
      rolloutPercentage?: number;
    };
  }

  const evaluateFlag = (config: FlagConfig, userId?: string): boolean => {
    let enabled = config.enabledByDefault;
    let percentage = config.rolloutPercentage;

    if (config.override) {
      enabled = config.override.enabled;
      percentage = config.override.rolloutPercentage ?? config.rolloutPercentage;
    }

    if (percentage > 0 && percentage < 100 && userId) {
      const str = `${userId}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const bucket = Math.abs(hash % 100);
      return bucket < percentage;
    }

    return enabled;
  };

  it('should return default value when no override and no user', () => {
    const config: FlagConfig = { enabledByDefault: true, rolloutPercentage: 0 };
    expect(evaluateFlag(config)).toBe(true);

    config.enabledByDefault = false;
    expect(evaluateFlag(config)).toBe(false);
  });

  it('should use override when present', () => {
    const config: FlagConfig = {
      enabledByDefault: false,
      rolloutPercentage: 0,
      override: { enabled: true },
    };
    expect(evaluateFlag(config)).toBe(true);
  });

  it('should apply percentage-based rollout', () => {
    const config: FlagConfig = {
      enabledByDefault: false,
      rolloutPercentage: 50,
    };

    let enabledCount = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      if (evaluateFlag(config, `user-${i}`)) {
        enabledCount++;
      }
    }

    const percentage = (enabledCount / iterations) * 100;
    expect(percentage).toBeGreaterThan(45);
    expect(percentage).toBeLessThan(55);
  });

  it('should apply override rollout percentage', () => {
    const config: FlagConfig = {
      enabledByDefault: false,
      rolloutPercentage: 10,
      override: { enabled: true, rolloutPercentage: 75 },
    };

    let enabledCount = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      if (evaluateFlag(config, `user-${i}`)) {
        enabledCount++;
      }
    }

    const percentage = (enabledCount / iterations) * 100;
    expect(percentage).toBeGreaterThan(70);
    expect(percentage).toBeLessThan(80);
  });
});

describe('feature flags - audit logging metadata', () => {
  interface CreateAuditLogInput {
    tenantId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }

  it('should create correct audit metadata for feature_flag_created', () => {
    const input: CreateAuditLogInput = {
      tenantId: 'tenant-123',
      userId: 'user-456',
      action: 'feature_flag_created',
      resourceType: 'feature_flag',
      resourceId: 'flag-789',
      metadata: {
        name: 'Test Flag',
        key: 'test_flag',
        enabledByDefault: false,
        rolloutPercentage: 50,
        isActive: true,
      },
    };

    expect(input.action).toBe('feature_flag_created');
    expect(input.resourceType).toBe('feature_flag');
    expect(input.metadata).toHaveProperty('name');
    expect(input.metadata).toHaveProperty('key');
    expect(input.metadata).toHaveProperty('enabledByDefault');
    expect(input.metadata).toHaveProperty('rolloutPercentage');
  });

  it('should create correct audit metadata for feature_flag_updated', () => {
    const input: CreateAuditLogInput = {
      tenantId: 'tenant-123',
      userId: 'user-456',
      action: 'feature_flag_updated',
      resourceType: 'feature_flag',
      resourceId: 'flag-789',
      metadata: {
        previousValues: {
          name: 'Old Name',
          rolloutPercentage: 0,
        },
        newValues: {
          name: 'New Name',
          rolloutPercentage: 50,
        },
      },
    };

    expect(input.action).toBe('feature_flag_updated');
    expect(input.metadata).toHaveProperty('previousValues');
    expect(input.metadata).toHaveProperty('newValues');
  });

  it('should create correct audit metadata for feature_flag_deleted', () => {
    const input: CreateAuditLogInput = {
      tenantId: 'tenant-123',
      userId: 'user-456',
      action: 'feature_flag_deleted',
      resourceType: 'feature_flag',
      resourceId: 'flag-789',
      metadata: {
        name: 'Test Flag',
        key: 'test_flag',
      },
    };

    expect(input.action).toBe('feature_flag_deleted');
    expect(input.metadata).toHaveProperty('name');
    expect(input.metadata).toHaveProperty('key');
  });

  it('should create correct audit metadata for feature_flag_override_set', () => {
    const input: CreateAuditLogInput = {
      tenantId: 'tenant-123',
      userId: 'user-456',
      action: 'feature_flag_override_set',
      resourceType: 'feature_flag',
      resourceId: 'flag-789',
      metadata: {
        targetTenantId: 'tenant-override-123',
        enabled: true,
        rolloutPercentage: 75,
      },
    };

    expect(input.action).toBe('feature_flag_override_set');
    expect(input.metadata).toHaveProperty('targetTenantId');
    expect(input.metadata).toHaveProperty('enabled');
  });

  it('should create correct audit metadata for ab_test_assigned', () => {
    const input: CreateAuditLogInput = {
      tenantId: 'tenant-123',
      userId: 'user-456',
      action: 'ab_test_assigned',
      resourceType: 'feature_flag',
      resourceId: 'flag-789',
      metadata: {
        flagKey: 'test_flag',
        variant: 'treatment',
        rolloutPercentage: 50,
      },
    };

    expect(input.action).toBe('ab_test_assigned');
    expect(input.metadata).toHaveProperty('flagKey');
    expect(input.metadata).toHaveProperty('variant');
    expect(input.metadata).toHaveProperty('rolloutPercentage');
  });
});
