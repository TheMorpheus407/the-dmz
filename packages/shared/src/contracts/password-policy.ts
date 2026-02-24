import { z } from 'zod';

export const PasswordRequirement = {
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  REQUIRE_UPPERCASE: 'requireUppercase',
  REQUIRE_LOWERCASE: 'requireLowercase',
  REQUIRE_NUMBER: 'requireNumber',
  REQUIRE_SPECIAL: 'requireSpecial',
} as const;

export type PasswordRequirement = (typeof PasswordRequirement)[keyof typeof PasswordRequirement];

export const passwordRequirementSchema = z.enum([
  PasswordRequirement.MIN_LENGTH,
  PasswordRequirement.MAX_LENGTH,
  PasswordRequirement.REQUIRE_UPPERCASE,
  PasswordRequirement.REQUIRE_LOWERCASE,
  PasswordRequirement.REQUIRE_NUMBER,
  PasswordRequirement.REQUIRE_SPECIAL,
]);

export const PasswordCharacterClass = {
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
  NUMBER: 'number',
  SPECIAL: 'special',
} as const;

export type PasswordCharacterClass =
  (typeof PasswordCharacterClass)[keyof typeof PasswordCharacterClass];

export const passwordCharacterClassSchema = z.enum([
  PasswordCharacterClass.UPPERCASE,
  PasswordCharacterClass.LOWERCASE,
  PasswordCharacterClass.NUMBER,
  PasswordCharacterClass.SPECIAL,
]);

export const compromisedCredentialModeSchema = z.enum(['enabled', 'disabled', 'degraded']);

export type CompromisedCredentialMode = z.infer<typeof compromisedCredentialModeSchema>;

export const degradedModeBehaviorSchema = z.enum(['failOpen', 'failClosed']);

export type DegradedModeBehavior = z.infer<typeof degradedModeBehaviorSchema>;

export const passwordPolicyManifestSchema = z.object({
  version: z.string().describe('Policy version'),
  enabled: z.boolean().describe('Whether password policy is enabled'),
  defaults: z.object({
    minLength: z.number().int().min(8).max(128).describe('Minimum password length'),
    maxLength: z.number().int().min(8).max(128).describe('Maximum password length'),
    requireUppercase: z.boolean().describe('Require at least one uppercase letter'),
    requireLowercase: z.boolean().describe('Require at least one lowercase letter'),
    requireNumber: z.boolean().describe('Require at least one number'),
    requireSpecial: z.boolean().describe('Require at least one special character'),
    characterClassesRequired: z
      .number()
      .int()
      .min(1)
      .max(4)
      .describe('Number of character classes required'),
  }),
  guardrails: z.object({
    minLengthMin: z
      .number()
      .int()
      .min(8)
      .describe('Minimum allowed minLength for tenant overrides'),
    minLengthMax: z
      .number()
      .int()
      .max(128)
      .describe('Maximum allowed minLength for tenant overrides'),
    maxLengthMin: z
      .number()
      .int()
      .min(8)
      .describe('Minimum allowed maxLength for tenant overrides'),
    maxLengthMax: z
      .number()
      .int()
      .max(128)
      .describe('Maximum allowed maxLength for tenant overrides'),
  }),
  compromisedCredential: z.object({
    enabled: z.boolean().describe('Whether compromised credential screening is enabled'),
    mode: compromisedCredentialModeSchema.describe('Screening mode'),
    degradedMode: z.object({
      behavior: degradedModeBehaviorSchema.describe('Behavior when provider is unavailable'),
    }),
    provider: z
      .object({
        type: z.string().describe('Provider type (e.g., hibp, custom)'),
        apiUrl: z.string().url().optional().describe('Custom provider API URL'),
        timeoutMs: z.number().int().positive().optional().describe('Provider timeout'),
      })
      .optional(),
  }),
  errorContract: z.object({
    errorCodes: z.record(z.string(), z.string()).describe('Error codes mapping'),
    requiredDetails: z.array(z.string()).describe('Required fields in error details'),
  }),
});

export type PasswordPolicyManifest = z.infer<typeof passwordPolicyManifestSchema>;

export type M1PasswordPolicyManifest = PasswordPolicyManifest;

const M1_DEFAULTS = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  characterClassesRequired: 3,
};

const M1_GUARDRAILS = {
  minLengthMin: 8,
  minLengthMax: 64,
  maxLengthMin: 64,
  maxLengthMax: 128,
};

const M1_COMPROMISED_CREDENTIAL = {
  enabled: true,
  mode: 'enabled' as const,
  degradedMode: {
    behavior: 'failOpen' as const,
  },
};

export const m1PasswordPolicyManifest: M1PasswordPolicyManifest = {
  version: '1.0.0',
  enabled: true,
  defaults: M1_DEFAULTS,
  guardrails: M1_GUARDRAILS,
  compromisedCredential: M1_COMPROMISED_CREDENTIAL,
  errorContract: {
    errorCodes: {
      AUTH_PASSWORD_TOO_SHORT: 'Password is below the minimum length requirement',
      AUTH_PASSWORD_TOO_LONG: 'Password exceeds the maximum length requirement',
      AUTH_PASSWORD_TOO_WEAK: 'Password does not meet complexity requirements',
      AUTH_PASSWORD_COMPROMISED: 'Password found in known data breach',
      AUTH_PASSWORD_POLICY_VIOLATION: 'Password policy violation',
    },
    requiredDetails: ['policyRequirements', 'violations'],
  },
} as const;

export type M1PasswordPolicy = typeof m1PasswordPolicyManifest;

export const PASSWORD_ERROR_CODES = {
  AUTH_PASSWORD_TOO_SHORT: 'AUTH_PASSWORD_TOO_SHORT',
  AUTH_PASSWORD_TOO_LONG: 'AUTH_PASSWORD_TOO_LONG',
  AUTH_PASSWORD_TOO_WEAK: 'AUTH_PASSWORD_TOO_WEAK',
  AUTH_PASSWORD_COMPROMISED: 'AUTH_PASSWORD_COMPROMISED',
  AUTH_PASSWORD_POLICY_VIOLATION: 'AUTH_PASSWORD_POLICY_VIOLATION',
} as const;

export type PasswordErrorCode = (typeof PASSWORD_ERROR_CODES)[keyof typeof PASSWORD_ERROR_CODES];

export interface PasswordPolicyRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  characterClassesRequired: number;
}

export interface PasswordValidationResult {
  valid: boolean;
  violations: PasswordRequirement[];
  characterClassesMet: number;
}

export const getCharacterClassesInPassword = (password: string): Set<PasswordCharacterClass> => {
  const classes = new Set<PasswordCharacterClass>();

  if (/[A-Z]/.test(password)) {
    classes.add(PasswordCharacterClass.UPPERCASE);
  }
  if (/[a-z]/.test(password)) {
    classes.add(PasswordCharacterClass.LOWERCASE);
  }
  if (/[0-9]/.test(password)) {
    classes.add(PasswordCharacterClass.NUMBER);
  }
  if (/[!@#$%^&*()_+\-={};'":\\|,.<>/?]/.test(password)) {
    classes.add(PasswordCharacterClass.SPECIAL);
  }

  return classes;
};

export const evaluatePasswordPolicy = (
  password: string,
  policy: PasswordPolicyRequirements,
): PasswordValidationResult => {
  const violations: PasswordRequirement[] = [];

  if (password.length < policy.minLength) {
    violations.push(PasswordRequirement.MIN_LENGTH);
  }

  if (password.length > policy.maxLength) {
    violations.push(PasswordRequirement.MAX_LENGTH);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    violations.push(PasswordRequirement.REQUIRE_UPPERCASE);
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    violations.push(PasswordRequirement.REQUIRE_LOWERCASE);
  }

  if (policy.requireNumber && !/[0-9]/.test(password)) {
    violations.push(PasswordRequirement.REQUIRE_NUMBER);
  }

  if (policy.requireSpecial && !/[!@#$%^&*()_+\-={};'":\\|,.<>/?]/.test(password)) {
    violations.push(PasswordRequirement.REQUIRE_SPECIAL);
  }

  const classesMet = getCharacterClassesInPassword(password).size;

  if (classesMet < policy.characterClassesRequired) {
    const missingClasses: PasswordRequirement[] = [];
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      missingClasses.push(PasswordRequirement.REQUIRE_UPPERCASE);
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      missingClasses.push(PasswordRequirement.REQUIRE_LOWERCASE);
    }
    if (policy.requireNumber && !/[0-9]/.test(password)) {
      missingClasses.push(PasswordRequirement.REQUIRE_NUMBER);
    }
    if (policy.requireSpecial && !/[!@#$%^&*()_+\-={};'":\\|,.<>/?]/.test(password)) {
      missingClasses.push(PasswordRequirement.REQUIRE_SPECIAL);
    }
    for (const missing of missingClasses) {
      if (!violations.includes(missing)) {
        violations.push(missing);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    characterClassesMet: classesMet,
  };
};

export const getTenantPolicy = (
  tenantOverrides: Partial<PasswordPolicyRequirements> | undefined,
  manifest: M1PasswordPolicyManifest = m1PasswordPolicyManifest,
): PasswordPolicyRequirements => {
  const defaults = manifest.defaults;
  const guardrails = manifest.guardrails;

  const minLength = Math.max(
    guardrails.minLengthMin,
    Math.min(tenantOverrides?.minLength ?? defaults.minLength, guardrails.minLengthMax),
  );

  const maxLength = Math.max(
    guardrails.maxLengthMin,
    Math.min(tenantOverrides?.maxLength ?? defaults.maxLength, guardrails.maxLengthMax),
  );

  return {
    minLength,
    maxLength,
    requireUppercase: tenantOverrides?.requireUppercase ?? defaults.requireUppercase,
    requireLowercase: tenantOverrides?.requireLowercase ?? defaults.requireLowercase,
    requireNumber: tenantOverrides?.requireNumber ?? defaults.requireNumber,
    requireSpecial: tenantOverrides?.requireSpecial ?? defaults.requireSpecial,
    characterClassesRequired:
      tenantOverrides?.characterClassesRequired ?? defaults.characterClassesRequired,
  };
};

export const compromisedCredentialSchema = z.enum(['enabled', 'disabled', 'degraded']);

export type CompromisedCredentialScreeningResult =
  | { compromised: true; provider: string; breachCount?: number }
  | { compromised: false; provider: string }
  | { unavailable: true; provider: string; error: string };

export interface CompromisedCredentialProvider {
  checkPassword: (password: string) => Promise<CompromisedCredentialScreeningResult>;
  getProviderName: () => string;
}

export const createNoOpCompromisedCredentialProvider = (): CompromisedCredentialProvider => ({
  checkPassword: async () => ({
    compromised: false,
    provider: 'noop',
  }),
  getProviderName: () => 'noop',
});
