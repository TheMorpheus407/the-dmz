import { describe, expect, it } from 'vitest';

import {
  TenantTier,
  CredentialClass,
  m1TierQuotaMatrix,
  tierQuotaBaselineSchema,
  effectiveQuotaPolicySchema,
  REQUIRED_QUOTA_HEADERS,
  QUOTA_ERROR_CODE,
} from '@the-dmz/shared/contracts';

describe('tenant quota policy contract', () => {
  describe('tier quota baselines', () => {
    it('should have baseline for standard tier', () => {
      const standard = m1TierQuotaMatrix.baselines.find((b) => b.tier === TenantTier.STANDARD);
      expect(standard).toBeDefined();
      expect(standard?.requestsPerMinute).toBe(60);
      expect(standard?.requestsPerHour).toBe(1000);
      expect(standard?.burstLimit).toBe(20);
    });

    it('should have baseline for professional tier', () => {
      const professional = m1TierQuotaMatrix.baselines.find(
        (b) => b.tier === TenantTier.PROFESSIONAL,
      );
      expect(professional).toBeDefined();
      expect(professional?.requestsPerMinute).toBe(300);
      expect(professional?.requestsPerHour).toBe(10_000);
      expect(professional?.burstLimit).toBe(50);
    });

    it('should have baseline for enterprise tier', () => {
      const enterprise = m1TierQuotaMatrix.baselines.find((b) => b.tier === TenantTier.ENTERPRISE);
      expect(enterprise).toBeDefined();
      expect(enterprise?.requestsPerMinute).toBe(1000);
      expect(enterprise?.requestsPerHour).toBe(100_000);
      expect(enterprise?.burstLimit).toBe(200);
    });

    it('should have baseline for custom tier with zero defaults', () => {
      const custom = m1TierQuotaMatrix.baselines.find((b) => b.tier === TenantTier.CUSTOM);
      expect(custom).toBeDefined();
      expect(custom?.requestsPerMinute).toBe(0);
      expect(custom?.requestsPerHour).toBe(0);
      expect(custom?.burstLimit).toBe(0);
    });

    it('should validate tier baseline schema', () => {
      const standard = m1TierQuotaMatrix.baselines.find((b) => b.tier === TenantTier.STANDARD);
      expect(() => tierQuotaBaselineSchema.parse(standard)).not.toThrow();
    });

    it('should include all credential classes in each tier', () => {
      for (const baseline of m1TierQuotaMatrix.baselines) {
        expect(baseline.credentialClasses).toContain(CredentialClass.API_KEY);
        expect(baseline.credentialClasses).toContain(CredentialClass.PAT);
        expect(baseline.credentialClasses).toContain(CredentialClass.SERVICE_CLIENT);
      }
    });
  });

  describe('effective quota policy', () => {
    it('should validate effective policy schema for standard tier', () => {
      const policy = {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        burstLimit: 20,
        tier: TenantTier.STANDARD,
        credentialClass: CredentialClass.API_KEY,
        isOverridden: false,
        overrideId: null,
        policyVersion: '1.0.0',
      };

      expect(() => effectiveQuotaPolicySchema.parse(policy)).not.toThrow();
    });

    it('should validate effective policy schema for enterprise tier', () => {
      const policy = {
        requestsPerMinute: 1000,
        requestsPerHour: 100_000,
        burstLimit: 200,
        tier: TenantTier.ENTERPRISE,
        credentialClass: CredentialClass.PAT,
        isOverridden: true,
        overrideId: '550e8400-e29b-41d4-a716-446655440000',
        policyVersion: '1.0.0',
      };

      expect(() => effectiveQuotaPolicySchema.parse(policy)).not.toThrow();
    });

    it('should reject invalid tier in policy', () => {
      const policy = {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        burstLimit: 20,
        tier: 'invalid' as TenantTier,
        credentialClass: CredentialClass.API_KEY,
        isOverridden: false,
        overrideId: null,
        policyVersion: '1.0.0',
      };

      expect(() => effectiveQuotaPolicySchema.parse(policy)).toThrow();
    });
  });

  describe('quota matrix', () => {
    it('should have valid version', () => {
      expect(m1TierQuotaMatrix.version).toBe('1.0.0');
    });

    it('should have valid policy version', () => {
      expect(m1TierQuotaMatrix.policyVersion).toBe('1.0.0');
    });

    it('should have last updated date', () => {
      expect(m1TierQuotaMatrix.lastUpdated).toBeDefined();
    });

    it('should have default tier set to standard', () => {
      expect(m1TierQuotaMatrix.defaultTier).toBe(TenantTier.STANDARD);
    });

    it('should have all four tiers defined', () => {
      const tiers = m1TierQuotaMatrix.baselines.map((b) => b.tier);
      expect(tiers).toContain(TenantTier.STANDARD);
      expect(tiers).toContain(TenantTier.PROFESSIONAL);
      expect(tiers).toContain(TenantTier.ENTERPRISE);
      expect(tiers).toContain(TenantTier.CUSTOM);
    });
  });

  describe('required quota headers', () => {
    it('should have correct required headers', () => {
      expect(REQUIRED_QUOTA_HEADERS).toContain('x-quota-limit-minute');
      expect(REQUIRED_QUOTA_HEADERS).toContain('x-quota-remaining-minute');
      expect(REQUIRED_QUOTA_HEADERS).toContain('x-quota-limit-hour');
      expect(REQUIRED_QUOTA_HEADERS).toContain('x-quota-remaining-hour');
    });

    it('should have correct error code', () => {
      expect(QUOTA_ERROR_CODE).toBe('QUOTA_EXCEEDED');
    });
  });
});
