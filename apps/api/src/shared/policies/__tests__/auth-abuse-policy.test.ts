import { describe, expect, it } from 'vitest';

import {
  m1AuthAbusePolicyManifest,
  AuthAbuseLevel,
  ABUSE_ERROR_CODES,
  ABUSE_LEVEL_TO_STATUS,
  getThresholdForLevel,
  authAbusePolicyManifestSchema,
} from '@the-dmz/shared/contracts';

describe('auth abuse policy contract', () => {
  describe('policy manifest structure', () => {
    it('has valid schema structure', () => {
      const result = authAbusePolicyManifestSchema.safeParse(m1AuthAbusePolicyManifest);
      expect(result.success).toBe(true);
    });

    it('has valid version', () => {
      expect(m1AuthAbusePolicyManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('is enabled by default', () => {
      expect(m1AuthAbusePolicyManifest.enabled).toBe(true);
    });
  });

  describe('covered endpoints', () => {
    it('covers login endpoint', () => {
      const loginEndpoint = m1AuthAbusePolicyManifest.coveredEndpoints.find(
        (e) => e.path === '/auth/login' && e.method === 'POST',
      );
      expect(loginEndpoint).toBeDefined();
      expect(loginEndpoint?.category).toBe('login');
    });

    it('covers refresh endpoint', () => {
      const refreshEndpoint = m1AuthAbusePolicyManifest.coveredEndpoints.find(
        (e) => e.path === '/auth/refresh' && e.method === 'POST',
      );
      expect(refreshEndpoint).toBeDefined();
      expect(refreshEndpoint?.category).toBe('refresh');
    });

    it('covers register endpoint', () => {
      const registerEndpoint = m1AuthAbusePolicyManifest.coveredEndpoints.find(
        (e) => e.path === '/auth/register' && e.method === 'POST',
      );
      expect(registerEndpoint).toBeDefined();
      expect(registerEndpoint?.category).toBe('register');
    });
  });

  describe('progressive thresholds', () => {
    it('has correct number of thresholds', () => {
      expect(m1AuthAbusePolicyManifest.thresholds).toHaveLength(4);
    });

    it('has cooldown threshold at index 0', () => {
      const cooldown = m1AuthAbusePolicyManifest.thresholds[0];
      expect(cooldown?.failures).toBe(3);
      expect(cooldown?.windowMs).toBe(300_000);
      expect(cooldown?.responseStatus).toBe(429);
      expect(cooldown?.errorCode).toBe('AUTH_ABUSE_COOLDOWN');
      expect(cooldown?.retryAfterSeconds).toBe(60);
    });

    it('has locked threshold at index 1', () => {
      const locked = m1AuthAbusePolicyManifest.thresholds[1];
      expect(locked?.failures).toBe(5);
      expect(locked?.windowMs).toBe(900_000);
      expect(locked?.responseStatus).toBe(403);
      expect(locked?.errorCode).toBe('AUTH_ABUSE_LOCKED');
    });

    it('has challenge required threshold at index 2', () => {
      const challenge = m1AuthAbusePolicyManifest.thresholds[2];
      expect(challenge?.failures).toBe(7);
      expect(challenge?.windowMs).toBe(1_800_000);
      expect(challenge?.responseStatus).toBe(403);
      expect(challenge?.errorCode).toBe('AUTH_ABUSE_CHALLENGE_REQUIRED');
    });

    it('has IP blocked threshold at index 3', () => {
      const ipBlocked = m1AuthAbusePolicyManifest.thresholds[3];
      expect(ipBlocked?.failures).toBe(10);
      expect(ipBlocked?.windowMs).toBe(3_600_000);
      expect(ipBlocked?.responseStatus).toBe(403);
      expect(ipBlocked?.errorCode).toBe('AUTH_ABUSE_IP_BLOCKED');
    });

    it('thresholds are progressive (increasing failures)', () => {
      for (let i = 1; i < m1AuthAbusePolicyManifest.thresholds.length; i++) {
        expect(m1AuthAbusePolicyManifest.thresholds[i]?.failures).toBeGreaterThan(
          m1AuthAbusePolicyManifest.thresholds[i - 1]?.failures ?? 0,
        );
      }
    });

    it('thresholds are progressive (increasing windows)', () => {
      for (let i = 1; i < m1AuthAbusePolicyManifest.thresholds.length; i++) {
        expect(m1AuthAbusePolicyManifest.thresholds[i]?.windowMs).toBeGreaterThan(
          m1AuthAbusePolicyManifest.thresholds[i - 1]?.windowMs ?? 0,
        );
      }
    });
  });

  describe('counter scope', () => {
    it('tracks per email within tenant', () => {
      expect(m1AuthAbusePolicyManifest.scope.email).toBe(true);
    });

    it('tracks per IP within tenant', () => {
      expect(m1AuthAbusePolicyManifest.scope.ip).toBe(true);
    });
  });

  describe('reset behavior', () => {
    it('resets on successful authentication', () => {
      expect(m1AuthAbusePolicyManifest.resetOnSuccess).toBe(true);
    });

    it('has reset window defined', () => {
      expect(m1AuthAbusePolicyManifest.resetWindowMs).toBeGreaterThan(0);
    });
  });

  describe('error codes', () => {
    it('has correct error codes for all levels', () => {
      expect(ABUSE_ERROR_CODES.AUTH_ABUSE_COOLDOWN).toBe('AUTH_ABUSE_COOLDOWN');
      expect(ABUSE_ERROR_CODES.AUTH_ABUSE_LOCKED).toBe('AUTH_ABUSE_LOCKED');
      expect(ABUSE_ERROR_CODES.AUTH_ABUSE_CHALLENGE_REQUIRED).toBe('AUTH_ABUSE_CHALLENGE_REQUIRED');
      expect(ABUSE_ERROR_CODES.AUTH_ABUSE_IP_BLOCKED).toBe('AUTH_ABUSE_IP_BLOCKED');
    });

    it('maps cooldown to 429', () => {
      expect(ABUSE_LEVEL_TO_STATUS[AuthAbuseLevel.COOLDOWN]).toBe(429);
    });

    it('maps locked to 403', () => {
      expect(ABUSE_LEVEL_TO_STATUS[AuthAbuseLevel.LOCKED]).toBe(403);
    });

    it('maps challenge_required to 403', () => {
      expect(ABUSE_LEVEL_TO_STATUS[AuthAbuseLevel.CHALLENGE_REQUIRED]).toBe(403);
    });

    it('maps ip_blocked to 403', () => {
      expect(ABUSE_LEVEL_TO_STATUS[AuthAbuseLevel.IP_BLOCKED]).toBe(403);
    });

    it('maps normal to 401', () => {
      expect(ABUSE_LEVEL_TO_STATUS[AuthAbuseLevel.NORMAL]).toBe(401);
    });
  });

  describe('getThresholdForLevel', () => {
    it('returns threshold for cooldown', () => {
      const threshold = getThresholdForLevel(AuthAbuseLevel.COOLDOWN);
      expect(threshold?.errorCode).toBe('AUTH_ABUSE_COOLDOWN');
    });

    it('returns threshold for locked', () => {
      const threshold = getThresholdForLevel(AuthAbuseLevel.LOCKED);
      expect(threshold?.errorCode).toBe('AUTH_ABUSE_LOCKED');
    });

    it('returns threshold for challenge_required', () => {
      const threshold = getThresholdForLevel(AuthAbuseLevel.CHALLENGE_REQUIRED);
      expect(threshold?.errorCode).toBe('AUTH_ABUSE_CHALLENGE_REQUIRED');
    });

    it('returns threshold for ip_blocked', () => {
      const threshold = getThresholdForLevel(AuthAbuseLevel.IP_BLOCKED);
      expect(threshold?.errorCode).toBe('AUTH_ABUSE_IP_BLOCKED');
    });

    it('returns undefined for normal', () => {
      const threshold = getThresholdForLevel(AuthAbuseLevel.NORMAL);
      expect(threshold).toBeUndefined();
    });
  });

  describe('header contract', () => {
    it('requires x-request-id header', () => {
      expect(m1AuthAbusePolicyManifest.headerContract.requiredHeaders).toContain('x-request-id');
    });

    it('requires retry-after on 429', () => {
      expect(m1AuthAbusePolicyManifest.headerContract.requiredOn429).toContain('retry-after');
    });

    it('requires x-abuse-level on 429', () => {
      expect(m1AuthAbusePolicyManifest.headerContract.requiredOn429).toContain('x-abuse-level');
    });

    it('requires x-abuse-level on 403', () => {
      expect(m1AuthAbusePolicyManifest.headerContract.requiredOn403).toContain('x-abuse-level');
    });
  });

  describe('error contract', () => {
    it('maps all abuse levels to error codes', () => {
      expect(m1AuthAbusePolicyManifest.errorContract.errorCodes[AuthAbuseLevel.NORMAL]).toBe(
        'AUTH_INVALID_CREDENTIALS',
      );
      expect(m1AuthAbusePolicyManifest.errorContract.errorCodes[AuthAbuseLevel.COOLDOWN]).toBe(
        'AUTH_ABUSE_COOLDOWN',
      );
      expect(m1AuthAbusePolicyManifest.errorContract.errorCodes[AuthAbuseLevel.LOCKED]).toBe(
        'AUTH_ABUSE_LOCKED',
      );
      expect(
        m1AuthAbusePolicyManifest.errorContract.errorCodes[AuthAbuseLevel.CHALLENGE_REQUIRED],
      ).toBe('AUTH_ABUSE_CHALLENGE_REQUIRED');
      expect(m1AuthAbusePolicyManifest.errorContract.errorCodes[AuthAbuseLevel.IP_BLOCKED]).toBe(
        'AUTH_ABUSE_IP_BLOCKED',
      );
    });

    it('requires abuse details in error response', () => {
      expect(m1AuthAbusePolicyManifest.errorContract.requiredDetails).toContain('abuseLevel');
      expect(m1AuthAbusePolicyManifest.errorContract.requiredDetails).toContain('failureCount');
      expect(m1AuthAbusePolicyManifest.errorContract.requiredDetails).toContain('windowExpiresAt');
    });
  });
});

describe('tenant isolation', () => {
  it('auth abuse keys should be tenant-scoped', () => {
    expect(m1AuthAbusePolicyManifest.scope.email).toBe(true);
    expect(m1AuthAbusePolicyManifest.scope.ip).toBe(true);
  });
});
