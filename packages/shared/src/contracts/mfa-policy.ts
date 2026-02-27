import { z } from 'zod';

export const MfaPolicyMethod = {
  TOTP: 'totp',
  WEBAUTHN: 'webauthn',
  RECOVERY_CODE: 'recovery_code',
} as const;

export type MfaPolicyMethod = (typeof MfaPolicyMethod)[keyof typeof MfaPolicyMethod];

export const mfaPolicyMethodSchema = z.enum([
  MfaPolicyMethod.TOTP,
  MfaPolicyMethod.WEBAUTHN,
  MfaPolicyMethod.RECOVERY_CODE,
]);

export const MfaEnforcementScope = {
  ADMINS_ONLY: 'admins_only',
  ALL_USERS: 'all_users',
  SPECIFIC_ROLES: 'specific_roles',
} as const;

export type MfaEnforcementScope = (typeof MfaEnforcementScope)[keyof typeof MfaEnforcementScope];

export const mfaEnforcementScopeSchema = z.enum([
  MfaEnforcementScope.ADMINS_ONLY,
  MfaEnforcementScope.ALL_USERS,
  MfaEnforcementScope.SPECIFIC_ROLES,
]);

export const StepUpAction = {
  ROLE_ELEVATION: 'role_elevation',
  EXPORT_DATA: 'export_data',
  SSO_CONFIG_CHANGE: 'sso_config_change',
  SCIM_CONFIG_CHANGE: 'scim_config_change',
  RETENTION_POLICY_CHANGE: 'retention_policy_change',
  TENANT_SETTINGS_CHANGE: 'tenant_settings_change',
  USER_IMPERSONATION: 'user_impersonation',
  SECURITY_SETTINGS_CHANGE: 'security_settings_change',
} as const;

export type StepUpAction = (typeof StepUpAction)[keyof typeof StepUpAction];

export const stepUpActionSchema = z.enum([
  StepUpAction.ROLE_ELEVATION,
  StepUpAction.EXPORT_DATA,
  StepUpAction.SSO_CONFIG_CHANGE,
  StepUpAction.SCIM_CONFIG_CHANGE,
  StepUpAction.RETENTION_POLICY_CHANGE,
  StepUpAction.TENANT_SETTINGS_CHANGE,
  StepUpAction.USER_IMPERSONATION,
  StepUpAction.SECURITY_SETTINGS_CHANGE,
]);

export const AdaptiveMfaTrigger = {
  NEW_DEVICE: 'new_device',
  UNFAMILIAR_NETWORK: 'unfamiliar_network',
  IMPOSSIBLE_TRAVEL: 'impossible_travel',
  HIGH_RISK_LOCATION: 'high_risk_location',
} as const;

export type AdaptiveMfaTrigger = (typeof AdaptiveMfaTrigger)[keyof typeof AdaptiveMfaTrigger];

export const adaptiveMfaTriggerSchema = z.enum([
  AdaptiveMfaTrigger.NEW_DEVICE,
  AdaptiveMfaTrigger.UNFAMILIAR_NETWORK,
  AdaptiveMfaTrigger.IMPOSSIBLE_TRAVEL,
  AdaptiveMfaTrigger.HIGH_RISK_LOCATION,
]);

export const MfaChallengeOutcome = {
  SUCCESS: 'success',
  FAILED: 'failed',
  EXPIRED: 'expired',
  DENIED: 'denied',
  PENDING: 'pending',
} as const;

export type MfaChallengeOutcome = (typeof MfaChallengeOutcome)[keyof typeof MfaChallengeOutcome];

export const mfaChallengeOutcomeSchema = z.enum([
  MfaChallengeOutcome.SUCCESS,
  MfaChallengeOutcome.FAILED,
  MfaChallengeOutcome.EXPIRED,
  MfaChallengeOutcome.DENIED,
  MfaChallengeOutcome.PENDING,
]);

export const MfaPolicyErrorCode = {
  AUTH_MFA_POLICY_INVALID: 'AUTH_MFA_POLICY_INVALID',
  AUTH_MFA_ENROLLMENT_EXPIRED: 'AUTH_MFA_ENROLLMENT_EXPIRED',
  AUTH_STEP_UP_REQUIRED: 'AUTH_STEP_UP_REQUIRED',
  AUTH_STEP_UP_FAILED: 'AUTH_STEP_UP_FAILED',
  AUTH_STEP_UP_EXPIRED: 'AUTH_STEP_UP_EXPIRED',
  AUTH_ADAPTIVE_MFA_TRIGGERED: 'AUTH_ADAPTIVE_MFA_TRIGGERED',
  AUTH_MFA_METHOD_NOT_ALLOWED: 'AUTH_MFA_METHOD_NOT_ALLOWED',
} as const;

export type MfaPolicyErrorCode = (typeof MfaPolicyErrorCode)[keyof typeof MfaPolicyErrorCode];

export const MFA_POLICY_DEFAULTS = {
  ENROLLMENT_GRACE_PERIOD_DAYS: 14,
  MAX_ENROLLMENT_GRACE_PERIOD_DAYS: 30,
  MIN_ENROLLMENT_GRACE_PERIOD_DAYS: 0,
  STEP_UP_TTL_SECONDS: 300,
  MAX_STEP_UP_TTL_SECONDS: 600,
} as const;

export interface AdaptiveMfaPolicy {
  enabled: boolean;
  triggers: AdaptiveMfaTrigger[];
}

export const adaptiveMfaPolicySchema: z.ZodType<AdaptiveMfaPolicy> = z.object({
  enabled: z.boolean(),
  triggers: z.array(adaptiveMfaTriggerSchema),
});

export interface TenantMfaPolicy {
  enabled: boolean;
  allowedMethods: MfaPolicyMethod[];
  enforcementScope: MfaEnforcementScope;
  enforcedRoles: string[];
  enrollmentGracePeriodDays: number;
  stepUpRequiredActions: StepUpAction[];
  adaptiveMfa: AdaptiveMfaPolicy;
}

export const tenantMfaPolicySchema: z.ZodType<TenantMfaPolicy> = z.object({
  enabled: z.boolean(),
  allowedMethods: z.array(mfaPolicyMethodSchema).min(1),
  enforcementScope: mfaEnforcementScopeSchema,
  enforcedRoles: z.array(z.string()),
  enrollmentGracePeriodDays: z
    .number()
    .int()
    .min(MFA_POLICY_DEFAULTS.MIN_ENROLLMENT_GRACE_PERIOD_DAYS)
    .max(MFA_POLICY_DEFAULTS.MAX_ENROLLMENT_GRACE_PERIOD_DAYS),
  stepUpRequiredActions: z.array(stepUpActionSchema),
  adaptiveMfa: adaptiveMfaPolicySchema,
});

export const defaultTenantMfaPolicy: TenantMfaPolicy = {
  enabled: true,
  allowedMethods: [MfaPolicyMethod.WEBAUTHN, MfaPolicyMethod.TOTP],
  enforcementScope: MfaEnforcementScope.ADMINS_ONLY,
  enforcedRoles: ['super-admin', 'tenant-admin'],
  enrollmentGracePeriodDays: MFA_POLICY_DEFAULTS.ENROLLMENT_GRACE_PERIOD_DAYS,
  stepUpRequiredActions: [
    StepUpAction.ROLE_ELEVATION,
    StepUpAction.EXPORT_DATA,
    StepUpAction.SSO_CONFIG_CHANGE,
    StepUpAction.SCIM_CONFIG_CHANGE,
    StepUpAction.RETENTION_POLICY_CHANGE,
    StepUpAction.TENANT_SETTINGS_CHANGE,
    StepUpAction.USER_IMPERSONATION,
    StepUpAction.SECURITY_SETTINGS_CHANGE,
  ],
  adaptiveMfa: {
    enabled: false,
    triggers: [],
  },
};

export const resolveTenantMfaPolicy = (
  tenantSettings: Record<string, unknown> | undefined,
): TenantMfaPolicy => {
  if (!tenantSettings) {
    return defaultTenantMfaPolicy;
  }

  const mfaPolicySettings = tenantSettings['mfaPolicy'] as Partial<TenantMfaPolicy> | undefined;

  if (!mfaPolicySettings) {
    return defaultTenantMfaPolicy;
  }

  return {
    enabled: mfaPolicySettings.enabled ?? defaultTenantMfaPolicy.enabled,
    allowedMethods: mfaPolicySettings.allowedMethods ?? defaultTenantMfaPolicy.allowedMethods,
    enforcementScope: mfaPolicySettings.enforcementScope ?? defaultTenantMfaPolicy.enforcementScope,
    enforcedRoles: mfaPolicySettings.enforcedRoles ?? defaultTenantMfaPolicy.enforcedRoles,
    enrollmentGracePeriodDays:
      mfaPolicySettings.enrollmentGracePeriodDays ??
      defaultTenantMfaPolicy.enrollmentGracePeriodDays,
    stepUpRequiredActions:
      mfaPolicySettings.stepUpRequiredActions ?? defaultTenantMfaPolicy.stepUpRequiredActions,
    adaptiveMfa: mfaPolicySettings.adaptiveMfa ?? defaultTenantMfaPolicy.adaptiveMfa,
  };
};

export const validateTenantMfaPolicy = (policy: unknown): { valid: boolean; errors: string[] } => {
  const result = tenantMfaPolicySchema.safeParse(policy);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { valid: false, errors };
};

export const isMfaRequiredForUser = (policy: TenantMfaPolicy, userRole: string): boolean => {
  if (!policy.enabled) {
    return false;
  }

  if (policy.enforcementScope === MfaEnforcementScope.ALL_USERS) {
    return true;
  }

  if (policy.enforcementScope === MfaEnforcementScope.ADMINS_ONLY) {
    return policy.enforcedRoles?.includes(userRole) ?? false;
  }

  if (policy.enforcementScope === MfaEnforcementScope.SPECIFIC_ROLES) {
    return policy.enforcedRoles?.includes(userRole) ?? false;
  }

  return false;
};

export interface MfaEnrollmentState {
  enrolled: boolean;
  methods: MfaPolicyMethod[];
  enrollmentDate: Date | null;
  gracePeriodEndDate: Date | null;
  withinGracePeriod: boolean;
}

export const isWithinEnrollmentGracePeriod = (
  enrollmentDate: Date | null,
  gracePeriodDays: number,
): boolean => {
  if (!enrollmentDate) {
    return false;
  }

  const now = new Date();
  const gracePeriodEnd = new Date(enrollmentDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

  return now < gracePeriodEnd;
};

export const getMfaEnrollmentState = (
  userMfaPolicyMethods: MfaPolicyMethod[],
  enrollmentDate: Date | null,
  gracePeriodDays: number,
): MfaEnrollmentState => {
  const withinGracePeriod = isWithinEnrollmentGracePeriod(enrollmentDate, gracePeriodDays);

  return {
    enrolled: userMfaPolicyMethods.length > 0,
    methods: userMfaPolicyMethods,
    enrollmentDate,
    gracePeriodEndDate: enrollmentDate
      ? new Date(enrollmentDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
      : null,
    withinGracePeriod,
  };
};

export interface StepUpContext {
  action: StepUpAction;
  userId: string;
  tenantId: string;
  sessionId: string;
  requestedAt: Date;
  expiresAt: Date;
  proof: string | null;
  verified: boolean;
}

export const STEP_UP_TTL_SECONDS = MFA_POLICY_DEFAULTS.STEP_UP_TTL_SECONDS;

export const createStepUpContext = (
  action: StepUpAction,
  userId: string,
  tenantId: string,
  sessionId: string,
): StepUpContext => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STEP_UP_TTL_SECONDS * 1000);

  return {
    action,
    userId,
    tenantId,
    sessionId,
    requestedAt: now,
    expiresAt,
    proof: null,
    verified: false,
  };
};

export const verifyStepUpProof = (context: StepUpContext, proof: string): boolean => {
  if (new Date() > context.expiresAt) {
    return false;
  }

  if (context.proof === null) {
    return false;
  }

  return context.proof === proof;
};

export const isStepUpRequired = (policy: TenantMfaPolicy, action: StepUpAction): boolean => {
  return policy.stepUpRequiredActions.includes(action);
};

export interface AdaptiveMfaEvaluation {
  triggered: boolean;
  triggers: AdaptiveMfaTrigger[];
  riskScore: number;
}

export const evaluateAdaptiveMfa = (
  policy: AdaptiveMfaPolicy,
  context: {
    isNewDevice: boolean;
    isUnfamiliarNetwork: boolean;
    isImpossibleTravel: boolean;
    isHighRiskLocation: boolean;
  },
): AdaptiveMfaEvaluation => {
  if (!policy.enabled) {
    return {
      triggered: false,
      triggers: [],
      riskScore: 0,
    };
  }

  const triggeredTriggers: AdaptiveMfaTrigger[] = [];
  let riskScore = 0;

  if (policy.triggers.includes(AdaptiveMfaTrigger.NEW_DEVICE) && context.isNewDevice) {
    triggeredTriggers.push(AdaptiveMfaTrigger.NEW_DEVICE);
    riskScore += 25;
  }

  if (
    policy.triggers.includes(AdaptiveMfaTrigger.UNFAMILIAR_NETWORK) &&
    context.isUnfamiliarNetwork
  ) {
    triggeredTriggers.push(AdaptiveMfaTrigger.UNFAMILIAR_NETWORK);
    riskScore += 30;
  }

  if (
    policy.triggers.includes(AdaptiveMfaTrigger.IMPOSSIBLE_TRAVEL) &&
    context.isImpossibleTravel
  ) {
    triggeredTriggers.push(AdaptiveMfaTrigger.IMPOSSIBLE_TRAVEL);
    riskScore += 50;
  }

  if (
    policy.triggers.includes(AdaptiveMfaTrigger.HIGH_RISK_LOCATION) &&
    context.isHighRiskLocation
  ) {
    triggeredTriggers.push(AdaptiveMfaTrigger.HIGH_RISK_LOCATION);
    riskScore += 40;
  }

  return {
    triggered: triggeredTriggers.length > 0,
    triggers: triggeredTriggers,
    riskScore,
  };
};

export const mfaPolicyErrorContractSchema = z.object({
  errorCodes: z.record(z.string(), z.string()),
  requiredDetails: z.array(z.string()),
});

export type MfaPolicyErrorContract = z.infer<typeof mfaPolicyErrorContractSchema>;

export const m1MfaPolicyErrorContract: MfaPolicyErrorContract = {
  errorCodes: {
    AUTH_MFA_POLICY_INVALID: 'MFA policy configuration is invalid',
    AUTH_MFA_ENROLLMENT_EXPIRED: 'MFA enrollment grace period has expired',
    AUTH_STEP_UP_REQUIRED: 'Step-up authentication required for this action',
    AUTH_STEP_UP_FAILED: 'Step-up authentication failed',
    AUTH_STEP_UP_EXPIRED: 'Step-up authentication proof has expired',
    AUTH_ADAPTIVE_MFA_TRIGGERED: 'Adaptive MFA was triggered due to risk detection',
    AUTH_MFA_METHOD_NOT_ALLOWED: 'MFA method not allowed by tenant policy',
  },
  requiredDetails: ['policyRequirements', 'availableMethods'],
};

export const mfaPolicyManifestSchema = z.object({
  version: z.string(),
  defaults: tenantMfaPolicySchema,
  guardrails: z.object({
    maxGracePeriodDays: z.number().int(),
    minGracePeriodDays: z.number().int(),
    maxStepUpTtlSeconds: z.number().int(),
    allowedMethods: z.array(mfaPolicyMethodSchema),
    allowedTriggers: z.array(adaptiveMfaTriggerSchema),
    allowedStepUpActions: z.array(stepUpActionSchema),
  }),
  errorContract: mfaPolicyErrorContractSchema,
});

export type MfaPolicyManifest = z.infer<typeof mfaPolicyManifestSchema>;

export type M1MfaPolicyManifest = MfaPolicyManifest;

export const m1MfaPolicyManifest: M1MfaPolicyManifest = {
  version: '1.0.0',
  defaults: defaultTenantMfaPolicy,
  guardrails: {
    maxGracePeriodDays: MFA_POLICY_DEFAULTS.MAX_ENROLLMENT_GRACE_PERIOD_DAYS,
    minGracePeriodDays: MFA_POLICY_DEFAULTS.MIN_ENROLLMENT_GRACE_PERIOD_DAYS,
    maxStepUpTtlSeconds: MFA_POLICY_DEFAULTS.MAX_STEP_UP_TTL_SECONDS,
    allowedMethods: [MfaPolicyMethod.TOTP, MfaPolicyMethod.WEBAUTHN, MfaPolicyMethod.RECOVERY_CODE],
    allowedTriggers: [
      AdaptiveMfaTrigger.NEW_DEVICE,
      AdaptiveMfaTrigger.UNFAMILIAR_NETWORK,
      AdaptiveMfaTrigger.IMPOSSIBLE_TRAVEL,
      AdaptiveMfaTrigger.HIGH_RISK_LOCATION,
    ],
    allowedStepUpActions: [
      StepUpAction.ROLE_ELEVATION,
      StepUpAction.EXPORT_DATA,
      StepUpAction.SSO_CONFIG_CHANGE,
      StepUpAction.SCIM_CONFIG_CHANGE,
      StepUpAction.RETENTION_POLICY_CHANGE,
      StepUpAction.TENANT_SETTINGS_CHANGE,
      StepUpAction.USER_IMPERSONATION,
      StepUpAction.SECURITY_SETTINGS_CHANGE,
    ],
  },
  errorContract: m1MfaPolicyErrorContract,
};
