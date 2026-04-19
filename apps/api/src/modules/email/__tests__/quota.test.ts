import { describe, it, expect, beforeEach } from 'vitest';

import { createTestId } from '@the-dmz/shared/testing';

import { quotaService, PlanTier } from '../quota.service.js';

describe('quotaService', () => {
  const tenantId = 'tenant-1';
  const integrationId = 'int-1';

  beforeEach(async () => {
    await quotaService.resetQuota(tenantId, integrationId);
    await quotaService.resetQuota('tenant-1', 'int-1');
  });

  describe('initialize', () => {
    it('should initialize quota for a tenant', async () => {
      await quotaService.initialize(tenantId, integrationId, PlanTier.STARTER);

      const usage = await quotaService.getUsage(tenantId, integrationId);
      expect(usage).not.toBeNull();
      expect(usage?.dailySent).toBe(0);
    });
  });

  describe('getLimits', () => {
    it('should return correct limits for starter tier', async () => {
      const limits = await quotaService.getLimits(PlanTier.STARTER);

      expect(limits.dailyLimit).toBe(1000);
      expect(limits.hourlyLimit).toBe(100);
      expect(limits.minutelyLimit).toBe(10);
    });

    it('should return correct limits for enterprise tier', async () => {
      const limits = await quotaService.getLimits(PlanTier.ENTERPRISE);

      expect(limits.dailyLimit).toBe(1000000);
      expect(limits.hourlyLimit).toBe(50000);
      expect(limits.minutelyLimit).toBe(1000);
    });
  });

  describe('checkQuota', () => {
    it('should allow sending within quota', async () => {
      await quotaService.initialize(tenantId, integrationId, PlanTier.STARTER);

      const result = await quotaService.checkQuota(tenantId, integrationId, 5);

      expect(result.allowed).toBe(true);
    });

    it('should deny exceeding max recipients per send', async () => {
      await quotaService.initialize(tenantId, integrationId, PlanTier.STARTER);

      const result = await quotaService.checkQuota(tenantId, integrationId, 20);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum');
    });
  });

  describe('consumeQuota', () => {
    it('should consume quota when sending', async () => {
      const testIntId = createTestId('consume1');
      await quotaService.initialize(tenantId, testIntId, PlanTier.STARTER);

      const result = await quotaService.consumeQuota(tenantId, testIntId, 1);

      expect(result.allowed).toBe(true);
    });
  });

  describe('updateTier', () => {
    it('should update tier and apply new limits', async () => {
      await quotaService.initialize(tenantId, integrationId, PlanTier.STARTER);

      await quotaService.updateTier(tenantId, integrationId, PlanTier.ENTERPRISE);

      const limits = await quotaService.getLimits(PlanTier.ENTERPRISE);
      const usage = await quotaService.getUsage(tenantId, integrationId);

      expect(usage?.dailyRemaining).toBe(limits.dailyLimit);
    });
  });

  describe('getTierFromString', () => {
    it('should convert valid tier string', () => {
      expect(quotaService.getTierFromString('enterprise')).toBe(PlanTier.ENTERPRISE);
      expect(quotaService.getTierFromString('starter')).toBe(PlanTier.STARTER);
    });

    it('should default to starter for invalid tier', () => {
      expect(quotaService.getTierFromString('invalid')).toBe(PlanTier.STARTER);
    });
  });

  describe('rate limiting', () => {
    it('should enforce minutely rate limit', async () => {
      const testIntId = createTestId('ratelimit1');
      await quotaService.initialize(tenantId, testIntId, PlanTier.STARTER);

      for (let i = 0; i < 10; i++) {
        await quotaService.consumeQuota(tenantId, testIntId, 1);
      }

      const result = await quotaService.checkQuota(tenantId, testIntId, 1);

      expect(result.allowed).toBe(false);
    });
  });
});
