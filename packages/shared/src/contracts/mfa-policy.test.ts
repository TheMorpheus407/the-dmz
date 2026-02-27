import { describe, it, expect } from 'vitest';

import {
  MfaPolicyMethod,
  MfaEnforcementScope,
  StepUpAction,
  AdaptiveMfaTrigger,
  resolveTenantMfaPolicy,
  validateTenantMfaPolicy,
  isMfaRequiredForUser,
  isWithinEnrollmentGracePeriod,
  getMfaEnrollmentState,
  createStepUpContext,
  verifyStepUpProof,
  isStepUpRequired,
  evaluateAdaptiveMfa,
  defaultTenantMfaPolicy,
  tenantMfaPolicySchema,
  m1MfaPolicyManifest,
} from './mfa-policy.js';

describe('MFA Policy Contract', () => {
  describe('resolveTenantMfaPolicy', () => {
    it('should return default policy when tenant settings are undefined', () => {
      const result = resolveTenantMfaPolicy(undefined);
      expect(result).toEqual(defaultTenantMfaPolicy);
    });

    it('should return default policy when tenant settings are empty', () => {
      const result = resolveTenantMfaPolicy({});
      expect(result).toEqual(defaultTenantMfaPolicy);
    });

    it('should return default policy when mfaPolicy is not in settings', () => {
      const result = resolveTenantMfaPolicy({ otherSetting: 'value' });
      expect(result).toEqual(defaultTenantMfaPolicy);
    });

    it('should merge tenant-specific settings with defaults', () => {
      const tenantSettings = {
        mfaPolicy: {
          enabled: false,
          enrollmentGracePeriodDays: 7,
        },
      };
      const result = resolveTenantMfaPolicy(tenantSettings);
      expect(result.enabled).toBe(false);
      expect(result.enrollmentGracePeriodDays).toBe(7);
      expect(result.allowedMethods).toEqual(defaultTenantMfaPolicy.allowedMethods);
      expect(result.enforcementScope).toEqual(defaultTenantMfaPolicy.enforcementScope);
    });

    it('should fully override policy when provided', () => {
      const tenantSettings = {
        mfaPolicy: {
          enabled: true,
          allowedMethods: ['totp'],
          enforcementScope: 'all_users' as const,
          enrollmentGracePeriodDays: 21,
          stepUpRequiredActions: ['export_data' as const],
          adaptiveMfa: {
            enabled: true,
            triggers: ['new_device' as const],
          },
        },
      };
      const result = resolveTenantMfaPolicy(tenantSettings);
      expect(result.enabled).toBe(true);
      expect(result.allowedMethods).toEqual(['totp']);
      expect(result.enforcementScope).toBe('all_users');
      expect(result.enrollmentGracePeriodDays).toBe(21);
      expect(result.stepUpRequiredActions).toEqual(['export_data']);
      expect(result.adaptiveMfa.enabled).toBe(true);
      expect(result.adaptiveMfa.triggers).toEqual(['new_device']);
    });
  });

  describe('validateTenantMfaPolicy', () => {
    it('should return valid for valid policy', () => {
      const result = validateTenantMfaPolicy(defaultTenantMfaPolicy);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid allowedMethods', () => {
      const result = validateTenantMfaPolicy({
        ...defaultTenantMfaPolicy,
        allowedMethods: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for invalid grace period', () => {
      const result = validateTenantMfaPolicy({
        ...defaultTenantMfaPolicy,
        enrollmentGracePeriodDays: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('enrollmentGracePeriodDays'))).toBe(true);
    });

    it('should return errors for missing required fields', () => {
      const result = validateTenantMfaPolicy({
        enabled: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for invalid enforcement scope', () => {
      const result = validateTenantMfaPolicy({
        ...defaultTenantMfaPolicy,
        enforcementScope: 'invalid_scope',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('isMfaRequiredForUser', () => {
    it('should return false when MFA is disabled', () => {
      const policy = { ...defaultTenantMfaPolicy, enabled: false };
      const result = isMfaRequiredForUser(policy, 'super-admin');
      expect(result).toBe(false);
    });

    it('should return true for admins when scope is admins_only', () => {
      const policy = {
        ...defaultTenantMfaPolicy,
        enforcementScope: MfaEnforcementScope.ADMINS_ONLY,
        enforcedRoles: ['super-admin', 'tenant-admin'],
      };
      expect(isMfaRequiredForUser(policy, 'super-admin')).toBe(true);
      expect(isMfaRequiredForUser(policy, 'tenant-admin')).toBe(true);
      expect(isMfaRequiredForUser(policy, 'learner')).toBe(false);
    });

    it('should return true for all users when scope is all_users', () => {
      const policy = {
        ...defaultTenantMfaPolicy,
        enforcementScope: MfaEnforcementScope.ALL_USERS,
      };
      expect(isMfaRequiredForUser(policy, 'super-admin')).toBe(true);
      expect(isMfaRequiredForUser(policy, 'learner')).toBe(true);
    });

    it('should return true only for specific roles when scope is specific_roles', () => {
      const policy = {
        ...defaultTenantMfaPolicy,
        enforcementScope: MfaEnforcementScope.SPECIFIC_ROLES,
        enforcedRoles: ['tenant-admin', 'manager'],
      };
      expect(isMfaRequiredForUser(policy, 'tenant-admin')).toBe(true);
      expect(isMfaRequiredForUser(policy, 'manager')).toBe(true);
      expect(isMfaRequiredForUser(policy, 'super-admin')).toBe(false);
      expect(isMfaRequiredForUser(policy, 'learner')).toBe(false);
    });
  });

  describe('isWithinEnrollmentGracePeriod', () => {
    it('should return false when enrollment date is null', () => {
      const result = isWithinEnrollmentGracePeriod(null, 14);
      expect(result).toBe(false);
    });

    it('should return true when within grace period', () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 7);
      const result = isWithinEnrollmentGracePeriod(enrollmentDate, 14);
      expect(result).toBe(true);
    });

    it('should return false when grace period has expired', () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 20);
      const result = isWithinEnrollmentGracePeriod(enrollmentDate, 14);
      expect(result).toBe(false);
    });

    it('should return false when exactly at grace period boundary', () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 14);
      enrollmentDate.setHours(0, 0, 0, 0);
      const result = isWithinEnrollmentGracePeriod(enrollmentDate, 14);
      expect(result).toBe(false);
    });
  });

  describe('getMfaEnrollmentState', () => {
    it('should return correct state when not enrolled', () => {
      const result = getMfaEnrollmentState([], null, 14);
      expect(result.enrolled).toBe(false);
      expect(result.methods).toEqual([]);
      expect(result.enrollmentDate).toBeNull();
      expect(result.withinGracePeriod).toBe(false);
    });

    it('should return correct state when enrolled within grace period', () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 7);
      const result = getMfaEnrollmentState([MfaPolicyMethod.WEBAUTHN], enrollmentDate, 14);
      expect(result.enrolled).toBe(true);
      expect(result.methods).toEqual([MfaPolicyMethod.WEBAUTHN]);
      expect(result.enrollmentDate).toEqual(enrollmentDate);
      expect(result.withinGracePeriod).toBe(true);
    });

    it('should return correct state when grace period expired', () => {
      const enrollmentDate = new Date();
      enrollmentDate.setDate(enrollmentDate.getDate() - 20);
      const result = getMfaEnrollmentState(
        [MfaPolicyMethod.WEBAUTHN, MfaPolicyMethod.TOTP],
        enrollmentDate,
        14,
      );
      expect(result.enrolled).toBe(true);
      expect(result.methods).toEqual([MfaPolicyMethod.WEBAUTHN, MfaPolicyMethod.TOTP]);
      expect(result.withinGracePeriod).toBe(false);
    });
  });

  describe('createStepUpContext', () => {
    it('should create context with correct TTL', () => {
      const context = createStepUpContext(
        StepUpAction.ROLE_ELEVATION,
        'user-123',
        'tenant-456',
        'session-789',
      );
      expect(context.action).toBe(StepUpAction.ROLE_ELEVATION);
      expect(context.userId).toBe('user-123');
      expect(context.tenantId).toBe('tenant-456');
      expect(context.sessionId).toBe('session-789');
      expect(context.verified).toBe(false);
      expect(context.proof).toBeNull();
      expect(new Date(context.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should create context with 5 minute TTL', () => {
      const before = Date.now() + 300 * 1000;
      const context = createStepUpContext(
        StepUpAction.EXPORT_DATA,
        'user-123',
        'tenant-456',
        'session-789',
      );
      const after = Date.now() + 300 * 1000;
      expect(new Date(context.expiresAt).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(context.expiresAt).getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('verifyStepUpProof', () => {
    it('should return false when proof is null', () => {
      const context = createStepUpContext(
        StepUpAction.ROLE_ELEVATION,
        'user-123',
        'tenant-456',
        'session-789',
      );
      const result = verifyStepUpProof(context, 'some-proof');
      expect(result).toBe(false);
    });

    it('should return false when proof does not match', () => {
      const context = createStepUpContext(
        StepUpAction.ROLE_ELEVATION,
        'user-123',
        'tenant-456',
        'session-789',
      );
      context.proof = 'correct-proof';
      const result = verifyStepUpProof(context, 'wrong-proof');
      expect(result).toBe(false);
    });

    it('should return true when proof matches', () => {
      const context = createStepUpContext(
        StepUpAction.ROLE_ELEVATION,
        'user-123',
        'tenant-456',
        'session-789',
      );
      context.proof = 'correct-proof';
      context.verified = true;
      const result = verifyStepUpProof(context, 'correct-proof');
      expect(result).toBe(true);
    });

    it('should return false when expired', async () => {
      const context = createStepUpContext(
        StepUpAction.ROLE_ELEVATION,
        'user-123',
        'tenant-456',
        'session-789',
      );
      context.proof = 'correct-proof';
      context.expiresAt = new Date(Date.now() - 1000);
      const result = verifyStepUpProof(context, 'correct-proof');
      expect(result).toBe(false);
    });
  });

  describe('isStepUpRequired', () => {
    it('should return true when action is in required list', () => {
      const policy = {
        ...defaultTenantMfaPolicy,
        stepUpRequiredActions: [StepUpAction.ROLE_ELEVATION, StepUpAction.EXPORT_DATA],
      };
      expect(isStepUpRequired(policy, StepUpAction.ROLE_ELEVATION)).toBe(true);
      expect(isStepUpRequired(policy, StepUpAction.EXPORT_DATA)).toBe(true);
    });

    it('should return false when action is not in required list', () => {
      const policy = {
        ...defaultTenantMfaPolicy,
        stepUpRequiredActions: [StepUpAction.ROLE_ELEVATION],
      };
      expect(isStepUpRequired(policy, StepUpAction.EXPORT_DATA)).toBe(false);
    });
  });

  describe('evaluateAdaptiveMfa', () => {
    it('should return not triggered when adaptive MFA is disabled', () => {
      const policy = { enabled: false, triggers: [] };
      const context = {
        isNewDevice: true,
        isUnfamiliarNetwork: true,
        isImpossibleTravel: true,
        isHighRiskLocation: true,
      };
      const result = evaluateAdaptiveMfa(policy, context);
      expect(result.triggered).toBe(false);
      expect(result.triggers).toEqual([]);
      expect(result.riskScore).toBe(0);
    });

    it('should trigger new device when configured', () => {
      const policy = {
        enabled: true,
        triggers: [AdaptiveMfaTrigger.NEW_DEVICE],
      };
      const context = {
        isNewDevice: true,
        isUnfamiliarNetwork: false,
        isImpossibleTravel: false,
        isHighRiskLocation: false,
      };
      const result = evaluateAdaptiveMfa(policy, context);
      expect(result.triggered).toBe(true);
      expect(result.triggers).toContain(AdaptiveMfaTrigger.NEW_DEVICE);
      expect(result.riskScore).toBe(25);
    });

    it('should trigger multiple factors', () => {
      const policy = {
        enabled: true,
        triggers: [
          AdaptiveMfaTrigger.NEW_DEVICE,
          AdaptiveMfaTrigger.IMPOSSIBLE_TRAVEL,
          AdaptiveMfaTrigger.HIGH_RISK_LOCATION,
        ],
      };
      const context = {
        isNewDevice: true,
        isUnfamiliarNetwork: false,
        isImpossibleTravel: true,
        isHighRiskLocation: true,
      };
      const result = evaluateAdaptiveMfa(policy, context);
      expect(result.triggered).toBe(true);
      expect(result.triggers).toContain(AdaptiveMfaTrigger.NEW_DEVICE);
      expect(result.triggers).toContain(AdaptiveMfaTrigger.IMPOSSIBLE_TRAVEL);
      expect(result.triggers).toContain(AdaptiveMfaTrigger.HIGH_RISK_LOCATION);
      expect(result.riskScore).toBe(25 + 50 + 40);
    });

    it('should not trigger when conditions not met', () => {
      const policy = {
        enabled: true,
        triggers: [AdaptiveMfaTrigger.NEW_DEVICE],
      };
      const context = {
        isNewDevice: false,
        isUnfamiliarNetwork: false,
        isImpossibleTravel: false,
        isHighRiskLocation: false,
      };
      const result = evaluateAdaptiveMfa(policy, context);
      expect(result.triggered).toBe(false);
      expect(result.triggers).toEqual([]);
      expect(result.riskScore).toBe(0);
    });
  });

  describe('m1MfaPolicyManifest', () => {
    it('should have valid schema version', () => {
      expect(m1MfaPolicyManifest.version).toBe('1.0.0');
    });

    it('should have valid defaults', () => {
      expect(m1MfaPolicyManifest.defaults).toEqual(defaultTenantMfaPolicy);
    });

    it('should have valid guardrails', () => {
      expect(m1MfaPolicyManifest.guardrails.maxGracePeriodDays).toBe(30);
      expect(m1MfaPolicyManifest.guardrails.minGracePeriodDays).toBe(0);
      expect(m1MfaPolicyManifest.guardrails.maxStepUpTtlSeconds).toBe(600);
      expect(m1MfaPolicyManifest.guardrails.allowedMethods).toContain(MfaPolicyMethod.TOTP);
      expect(m1MfaPolicyManifest.guardrails.allowedMethods).toContain(MfaPolicyMethod.WEBAUTHN);
      expect(m1MfaPolicyManifest.guardrails.allowedTriggers).toContain(
        AdaptiveMfaTrigger.NEW_DEVICE,
      );
      expect(m1MfaPolicyManifest.guardrails.allowedStepUpActions).toContain(
        StepUpAction.ROLE_ELEVATION,
      );
    });

    it('should have valid error contract', () => {
      expect(m1MfaPolicyManifest.errorContract.errorCodes.AUTH_MFA_POLICY_INVALID).toBeDefined();
      expect(m1MfaPolicyManifest.errorContract.errorCodes.AUTH_STEP_UP_REQUIRED).toBeDefined();
      expect(m1MfaPolicyManifest.errorContract.requiredDetails).toContain('policyRequirements');
    });
  });

  describe('tenantMfaPolicySchema', () => {
    it('should parse valid full policy', () => {
      const result = tenantMfaPolicySchema.safeParse(defaultTenantMfaPolicy);
      expect(result.success).toBe(true);
    });

    it('should reject policy with invalid method', () => {
      const result = tenantMfaPolicySchema.safeParse({
        ...defaultTenantMfaPolicy,
        allowedMethods: ['invalid_method'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject policy with grace period out of range', () => {
      const result = tenantMfaPolicySchema.safeParse({
        ...defaultTenantMfaPolicy,
        enrollmentGracePeriodDays: 50,
      });
      expect(result.success).toBe(false);
    });
  });
});
