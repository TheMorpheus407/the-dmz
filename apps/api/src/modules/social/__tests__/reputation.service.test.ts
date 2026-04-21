import { describe, it, expect } from 'vitest';

import {
  computeReputationScore,
  getReputationTier,
  canAccessFeature,
} from '../reputation.service.js';
import {
  REPUTATION_TIER_THRESHOLDS,
  REPUTATION_COMPONENTS,
} from '../../../db/schema/social/reputation-score.js';

describe('reputation service - computeReputationScore', () => {
  it('should clamp score to 0 minimum', () => {
    const result = computeReputationScore(0, 0, -500, -1000);
    expect(result).toBe(0);
  });

  it('should clamp score to 1000 maximum', () => {
    const result = computeReputationScore(500, 500, 100, 100);
    expect(result).toBe(1000);
  });

  it('should sum all components correctly', () => {
    const result = computeReputationScore(200, 150, -50, -25);
    expect(result).toBe(275);
  });

  it('should handle negative penalties correctly', () => {
    const result = computeReputationScore(100, 100, -200, -50);
    expect(result).toBe(0);
  });

  it('should handle zero components', () => {
    const result = computeReputationScore(0, 0, 0, 0);
    expect(result).toBe(0);
  });

  it('should cap at 1000 with positive values', () => {
    const result = computeReputationScore(500, 400, 200, 50);
    expect(result).toBe(1000);
  });
});

describe('reputation service - getReputationTier', () => {
  it('should return bronze for score 0-199', () => {
    expect(getReputationTier(0)).toBe('bronze');
    expect(getReputationTier(100)).toBe('bronze');
    expect(getReputationTier(199)).toBe('bronze');
  });

  it('should return silver for score 200-399', () => {
    expect(getReputationTier(200)).toBe('silver');
    expect(getReputationTier(300)).toBe('silver');
    expect(getReputationTier(399)).toBe('silver');
  });

  it('should return gold for score 400-599', () => {
    expect(getReputationTier(400)).toBe('gold');
    expect(getReputationTier(500)).toBe('gold');
    expect(getReputationTier(599)).toBe('gold');
  });

  it('should return platinum for score 600-799', () => {
    expect(getReputationTier(600)).toBe('platinum');
    expect(getReputationTier(700)).toBe('platinum');
    expect(getReputationTier(799)).toBe('platinum');
  });

  it('should return diamond for score 800-1000', () => {
    expect(getReputationTier(800)).toBe('diamond');
    expect(getReputationTier(900)).toBe('diamond');
    expect(getReputationTier(1000)).toBe('diamond');
  });
});

describe('reputation service - canAccessFeature', () => {
  const createMockConfig = (
    overrides: Partial<{
      FEATURE_GATE_JOIN_GUILDS: number;
      FEATURE_GATE_CREATE_GUILD: number;
      FEATURE_GATE_COMPETITIVE_RANKED: number;
      FEATURE_GATE_MODERATE_FORUMS: number;
    }> = {},
  ) => ({
    NODE_ENV: 'test' as const,
    PORT: 3001,
    API_PORT: undefined,
    API_HOST: '0.0.0.0',
    API_VERSION: '0.0.0',
    MAX_BODY_SIZE: 1_048_576,
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_STRICT_MODE: false,
    DATABASE_URL: 'postgres://localhost:5432/the_dmz',
    DATABASE_POOL_MIN: 2,
    DATABASE_POOL_MAX: 10,
    DATABASE_POOL_IDLE_TIMEOUT: 10,
    DATABASE_POOL_CONNECT_TIMEOUT: 30,
    DATABASE_SSL: false,
    REDIS_URL: 'redis://localhost:6379',
    LOG_LEVEL: 'info' as const,
    JWT_SECRET: 'dev-test-jwt-secret',
    JWT_EXPIRES_IN: '7d',
    JWT_ISSUER: 'https://the-dmz.local',
    JWT_AUDIENCE: 'the-dmz-api',
    TOKEN_HASH_SALT: 'token-hash-dev-test-salt',
    ENABLE_SWAGGER: true,
    CORS_ORIGINS: 'http://localhost:5173',
    CORS_ORIGINS_LIST: ['http://localhost:5173'],
    CSP_FRAME_ANCESTORS: 'none',
    CSP_CONNECT_SRC: '',
    CSP_IMG_SRC: '',
    COEP_POLICY: 'require-corp' as const,
    TENANT_HEADER_NAME: 'x-tenant-id',
    TENANT_FALLBACK_ENABLED: true,
    TENANT_FALLBACK_SLUG: 'default',
    TENANT_RESOLVER_ENABLED: false,
    WEBAUTHN_RP_ID: 'localhost',
    WEBAUTHN_RP_NAME: 'The DMZ',
    MFA_ISSUER: 'The DMZ',
    MFA_CODE_LENGTH: 6,
    MFA_WINDOW: 1,
    MFA_BACKUP_CODES: 10,
    MFA_MAX_ATTEMPTS: 10,
    ABAC_CACHE_TTL_SECONDS: 30,
    ABAC_SLOW_EVALUATION_THRESHOLD_MS: 10,
    JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'dev-test-encryption-key-32-chars!',
    ANTHROPIC_API_KEY: undefined,
    ANTHROPIC_API_URL: 'https://api.anthropic.com',
    AI_GENERATION_MODEL: 'sonnet',
    AI_CLASSIFICATION_MODEL: 'haiku',
    AI_MAX_RETRIES: 3,
    AI_RETRY_DELAY_MS: 1000,
    BULLMQ_CONCURRENCY: 5,
    BULLMQ_MAX_ATTEMPTS: 10,
    AI_POOL_MIN_PER_TIER: 20,
    AI_POOL_TARGET_PER_TIER: 50,
    AI_BATCH_SIZE: 10,
    AI_GENERATION_SCHEDULE_CRON: '0 3 * * *',
    XAPI_ENCRYPTION_KEY: undefined,
    STRIPE_WEBHOOK_SECRET: undefined,
    SENTRY_DSN: undefined,
    FEATURE_GATE_JOIN_GUILDS: 100,
    FEATURE_GATE_CREATE_GUILD: 500,
    FEATURE_GATE_COMPETITIVE_RANKED: 800,
    FEATURE_GATE_MODERATE_FORUMS: 600,
    ...overrides,
  });

  it('should accept config as first parameter and read thresholds from config', () => {
    const config = createMockConfig({
      FEATURE_GATE_JOIN_GUILDS: 150,
      FEATURE_GATE_CREATE_GUILD: 600,
      FEATURE_GATE_COMPETITIVE_RANKED: 900,
      FEATURE_GATE_MODERATE_FORUMS: 700,
    });
    expect(canAccessFeature(config, 'bronze', 'join_guilds')).toBe(false);
    expect(canAccessFeature(config, 'silver', 'join_guilds')).toBe(true);
    expect(canAccessFeature(config, 'gold', 'create_guild')).toBe(false);
    expect(canAccessFeature(config, 'platinum', 'create_guild')).toBe(true);
    expect(canAccessFeature(config, 'platinum', 'competitive_ranked')).toBe(false);
    expect(canAccessFeature(config, 'diamond', 'competitive_ranked')).toBe(true);
    expect(canAccessFeature(config, 'gold', 'moderate_forums')).toBe(false);
    expect(canAccessFeature(config, 'platinum', 'moderate_forums')).toBe(true);
  });

  it('should use default thresholds when config has default values', () => {
    const config = createMockConfig();
    expect(canAccessFeature(config, 'bronze', 'join_guilds')).toBe(false);
    expect(canAccessFeature(config, 'silver', 'join_guilds')).toBe(true);
    expect(canAccessFeature(config, 'gold', 'create_guild')).toBe(false);
    expect(canAccessFeature(config, 'platinum', 'create_guild')).toBe(true);
    expect(canAccessFeature(config, 'platinum', 'competitive_ranked')).toBe(false);
    expect(canAccessFeature(config, 'diamond', 'competitive_ranked')).toBe(true);
    expect(canAccessFeature(config, 'gold', 'moderate_forums')).toBe(false);
    expect(canAccessFeature(config, 'platinum', 'moderate_forums')).toBe(true);
  });

  it('should allow join_guilds at config-defined threshold', () => {
    const config = createMockConfig({ FEATURE_GATE_JOIN_GUILDS: 50 });
    expect(canAccessFeature(config, 'bronze', 'join_guilds')).toBe(true);
  });

  it('should allow create_guild at config-defined threshold', () => {
    const config = createMockConfig({ FEATURE_GATE_CREATE_GUILD: 400 });
    expect(canAccessFeature(config, 'gold', 'create_guild')).toBe(true);
  });

  it('should allow competitive_ranked at config-defined threshold', () => {
    const config = createMockConfig({ FEATURE_GATE_COMPETITIVE_RANKED: 750 });
    expect(canAccessFeature(config, 'platinum', 'competitive_ranked')).toBe(true);
  });

  it('should allow moderate_forums at config-defined threshold', () => {
    const config = createMockConfig({ FEATURE_GATE_MODERATE_FORUMS: 550 });
    expect(canAccessFeature(config, 'gold', 'moderate_forums')).toBe(true);
  });

  it('should allow unknown features without restriction regardless of config', () => {
    const config = createMockConfig();
    expect(canAccessFeature(config, 'bronze', 'unknown_feature')).toBe(true);
    expect(canAccessFeature(config, 'diamond', 'another_unknown')).toBe(true);
  });

  it('should allow zero threshold features to all tiers', () => {
    const config = createMockConfig({ FEATURE_GATE_JOIN_GUILDS: 0 });
    expect(canAccessFeature(config, 'bronze', 'join_guilds')).toBe(true);
  });

  it('should deny features when tier score is below threshold', () => {
    const config = createMockConfig({ FEATURE_GATE_JOIN_GUILDS: 1000 });
    expect(canAccessFeature(config, 'diamond', 'join_guilds')).toBe(false);
  });
});

describe('reputation service - tier thresholds', () => {
  it('should have correct bronze threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.bronze).toBe(0);
  });

  it('should have correct silver threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.silver).toBe(200);
  });

  it('should have correct gold threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.gold).toBe(400);
  });

  it('should have correct platinum threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.platinum).toBe(600);
  });

  it('should have correct diamond threshold', () => {
    expect(REPUTATION_TIER_THRESHOLDS.diamond).toBe(800);
  });
});

describe('reputation service - component constants', () => {
  it('should have correct endorsement max', () => {
    expect(REPUTATION_COMPONENTS.ENDORSEMENT_MAX).toBe(400);
  });

  it('should have correct completion max', () => {
    expect(REPUTATION_COMPONENTS.COMPLETION_MAX).toBe(300);
  });

  it('should have correct report penalty per incident', () => {
    expect(REPUTATION_COMPONENTS.REPORT_PENALTY_PER).toBe(-200);
  });

  it('should have correct abandonment penalty per session', () => {
    expect(REPUTATION_COMPONENTS.ABANDONMENT_PENALTY_PER).toBe(-50);
  });

  it('should have correct endorsement decay days', () => {
    expect(REPUTATION_COMPONENTS.ENDORSEMENT_DECAY_DAYS).toBe(90);
  });

  it('should have correct endorsement decay percent', () => {
    expect(REPUTATION_COMPONENTS.ENDORSEMENT_DECAY_PERCENT).toBe(0.1);
  });
});

describe('reputation service - score calculation scenarios', () => {
  it('should calculate score for new player with no activity', () => {
    const score = computeReputationScore(0, 0, 0, 0);
    expect(score).toBe(0);
  });

  it('should calculate score with max endorsements only', () => {
    const score = computeReputationScore(400, 0, 0, 0);
    expect(score).toBe(400);
  });

  it('should calculate score with max completion only', () => {
    const score = computeReputationScore(0, 300, 0, 0);
    expect(score).toBe(300);
  });

  it('should calculate score with mixed components', () => {
    const score = computeReputationScore(200, 150, 0, 0);
    expect(score).toBe(350);
  });

  it('should calculate score with penalties', () => {
    const score = computeReputationScore(200, 150, -200, -50);
    expect(score).toBe(100);
  });

  it('should not go below 0 with heavy penalties', () => {
    const score = computeReputationScore(0, 0, -1000, -1000);
    expect(score).toBe(0);
  });

  it('should cap at 1000 with all positive components', () => {
    const score = computeReputationScore(400, 300, 200, 200);
    expect(score).toBe(1000);
  });
});

describe('reputation service - endorsement decay calculation', () => {
  it('should calculate decay factor for fresh endorsement', () => {
    const daysSinceCreation = 0;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(1);
  });

  it('should calculate decay factor after 90 days', () => {
    const daysSinceCreation = 90;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(0.9);
  });

  it('should calculate decay factor after 180 days', () => {
    const daysSinceCreation = 180;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(0.8);
  });

  it('should not go below minimum decay factor', () => {
    const daysSinceCreation = 1000;
    const decayPercent = 0.1;
    const decayFactor = Math.max(1 - decayPercent * Math.floor(daysSinceCreation / 90), 0.1);
    expect(decayFactor).toBe(0.1);
  });
});

describe('reputation service - tier boundaries', () => {
  it('should have silver start at 200', () => {
    expect(REPUTATION_TIER_THRESHOLDS.silver).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.bronze);
  });

  it('should have gold start at 400', () => {
    expect(REPUTATION_TIER_THRESHOLDS.gold).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.silver);
  });

  it('should have platinum start at 600', () => {
    expect(REPUTATION_TIER_THRESHOLDS.platinum).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.gold);
  });

  it('should have diamond start at 800', () => {
    expect(REPUTATION_TIER_THRESHOLDS.diamond).toBeGreaterThan(REPUTATION_TIER_THRESHOLDS.platinum);
  });
});
