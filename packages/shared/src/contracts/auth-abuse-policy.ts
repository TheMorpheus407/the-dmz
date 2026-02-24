import { z } from 'zod';

export const AuthAbuseCategory = {
  LOGIN: 'login',
  REFRESH: 'refresh',
  REGISTER: 'register',
} as const;

export type AuthAbuseCategory = (typeof AuthAbuseCategory)[keyof typeof AuthAbuseCategory];

export const authAbuseCategorySchema = z.enum([
  AuthAbuseCategory.LOGIN,
  AuthAbuseCategory.REFRESH,
  AuthAbuseCategory.REGISTER,
]);

export const AuthAbuseLevel = {
  NORMAL: 'normal',
  COOLDOWN: 'cooldown',
  LOCKED: 'locked',
  CHALLENGE_REQUIRED: 'challenge_required',
  IP_BLOCKED: 'ip_blocked',
} as const;

export type AuthAbuseLevel = (typeof AuthAbuseLevel)[keyof typeof AuthAbuseLevel];

export const authAbuseLevelSchema = z.enum([
  AuthAbuseLevel.NORMAL,
  AuthAbuseLevel.COOLDOWN,
  AuthAbuseLevel.LOCKED,
  AuthAbuseLevel.CHALLENGE_REQUIRED,
  AuthAbuseLevel.IP_BLOCKED,
]);

export const abuseCounterKeySchema = z.enum(['email', 'ip']);

export type AbuseCounterKey = z.infer<typeof abuseCounterKeySchema>;

export const authAbuseThresholdSchema = z.object({
  failures: z.number().int().positive().describe('Number of failed attempts to trigger this level'),
  windowMs: z.number().int().positive().describe('Time window in milliseconds'),
  responseStatus: z.number().int().describe('HTTP status code to return'),
  errorCode: z.string().describe('Error code for this abuse level'),
  retryAfterSeconds: z.number().int().optional().describe('Retry-After seconds for 429 responses'),
});

export type AuthAbuseThreshold = z.infer<typeof authAbuseThresholdSchema>;

export const authAbuseCounterScopeSchema = z.object({
  email: z.boolean().describe('Track per email within tenant'),
  ip: z.boolean().describe('Track per IP address within tenant'),
});

export type AuthAbuseCounterScope = z.infer<typeof authAbuseCounterScopeSchema>;

export const authAbusePolicyManifestSchema = z.object({
  version: z.string().describe('Policy version'),
  enabled: z.boolean().describe('Whether abuse protection is enabled'),
  coveredEndpoints: z
    .array(
      z.object({
        path: z.string().describe('Route path pattern'),
        method: z.string().describe('HTTP method'),
        category: authAbuseCategorySchema,
      }),
    )
    .describe('Auth endpoints covered by abuse protection'),
  thresholds: z.array(authAbuseThresholdSchema).describe('Progressive response thresholds'),
  scope: authAbuseCounterScopeSchema.describe('Counter dimensions'),
  resetOnSuccess: z.boolean().describe('Reset counters on successful authentication'),
  resetWindowMs: z.number().int().positive().describe('Window for counter reset after success'),
  headerContract: z.object({
    requiredHeaders: z.array(z.string()).describe('Required headers in abuse responses'),
    requiredOn429: z.array(z.string()).describe('Required headers on 429 cooldown responses'),
    requiredOn403: z.array(z.string()).describe('Required headers on 403 lock/challenge responses'),
  }),
  errorContract: z.object({
    errorCodes: z.record(authAbuseLevelSchema, z.string()).describe('Error codes per abuse level'),
    requiredDetails: z.array(z.string()).describe('Required fields in error details'),
  }),
});

export type AuthAbusePolicyManifest = z.infer<typeof authAbusePolicyManifestSchema>;

export type M1AuthAbusePolicyManifest = AuthAbusePolicyManifest;

const M1_AUTH_ABUSE_THRESHOLDS: AuthAbuseThreshold[] = [
  {
    failures: 3,
    windowMs: 300_000,
    responseStatus: 429,
    errorCode: 'AUTH_ABUSE_COOLDOWN',
    retryAfterSeconds: 60,
  },
  {
    failures: 5,
    windowMs: 900_000,
    responseStatus: 403,
    errorCode: 'AUTH_ABUSE_LOCKED',
  },
  {
    failures: 7,
    windowMs: 1_800_000,
    responseStatus: 403,
    errorCode: 'AUTH_ABUSE_CHALLENGE_REQUIRED',
  },
  {
    failures: 10,
    windowMs: 3_600_000,
    responseStatus: 403,
    errorCode: 'AUTH_ABUSE_IP_BLOCKED',
  },
];

export const m1AuthAbusePolicyManifest: M1AuthAbusePolicyManifest = {
  version: '1.0.0',
  enabled: true,
  coveredEndpoints: [
    {
      path: '/auth/login',
      method: 'POST',
      category: AuthAbuseCategory.LOGIN,
    },
    {
      path: '/auth/refresh',
      method: 'POST',
      category: AuthAbuseCategory.REFRESH,
    },
    {
      path: '/auth/register',
      method: 'POST',
      category: AuthAbuseCategory.REGISTER,
    },
  ],
  thresholds: M1_AUTH_ABUSE_THRESHOLDS,
  scope: {
    email: true,
    ip: true,
  },
  resetOnSuccess: true,
  resetWindowMs: 86_400_000,
  headerContract: {
    requiredHeaders: ['x-request-id'],
    requiredOn429: ['retry-after', 'x-abuse-level', 'x-retry-after-seconds'],
    requiredOn403: ['x-abuse-level', 'x-abuse-reason'],
  },
  errorContract: {
    errorCodes: {
      [AuthAbuseLevel.NORMAL]: 'AUTH_INVALID_CREDENTIALS',
      [AuthAbuseLevel.COOLDOWN]: 'AUTH_ABUSE_COOLDOWN',
      [AuthAbuseLevel.LOCKED]: 'AUTH_ABUSE_LOCKED',
      [AuthAbuseLevel.CHALLENGE_REQUIRED]: 'AUTH_ABUSE_CHALLENGE_REQUIRED',
      [AuthAbuseLevel.IP_BLOCKED]: 'AUTH_ABUSE_IP_BLOCKED',
    },
    requiredDetails: ['abuseLevel', 'failureCount', 'windowExpiresAt'],
  },
} as const;

export type M1AuthAbusePolicy = typeof m1AuthAbusePolicyManifest;

export const ABUSE_ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ABUSE_COOLDOWN: 'AUTH_ABUSE_COOLDOWN',
  AUTH_ABUSE_LOCKED: 'AUTH_ABUSE_LOCKED',
  AUTH_ABUSE_CHALLENGE_REQUIRED: 'AUTH_ABUSE_CHALLENGE_REQUIRED',
  AUTH_ABUSE_IP_BLOCKED: 'AUTH_ABUSE_IP_BLOCKED',
} as const;

export type AbuseErrorCode = (typeof ABUSE_ERROR_CODES)[keyof typeof ABUSE_ERROR_CODES];

export const ABUSE_LEVEL_TO_STATUS: Record<AuthAbuseLevel, number> = {
  [AuthAbuseLevel.NORMAL]: 401,
  [AuthAbuseLevel.COOLDOWN]: 429,
  [AuthAbuseLevel.LOCKED]: 403,
  [AuthAbuseLevel.CHALLENGE_REQUIRED]: 403,
  [AuthAbuseLevel.IP_BLOCKED]: 403,
} as const;

export const getThresholdForLevel = (level: AuthAbuseLevel): AuthAbuseThreshold | undefined => {
  if (level === AuthAbuseLevel.NORMAL) {
    return undefined;
  }

  const levelToErrorCode: Record<AuthAbuseLevel, string> = {
    [AuthAbuseLevel.NORMAL]: 'AUTH_INVALID_CREDENTIALS',
    [AuthAbuseLevel.COOLDOWN]: 'AUTH_ABUSE_COOLDOWN',
    [AuthAbuseLevel.LOCKED]: 'AUTH_ABUSE_LOCKED',
    [AuthAbuseLevel.CHALLENGE_REQUIRED]: 'AUTH_ABUSE_CHALLENGE_REQUIRED',
    [AuthAbuseLevel.IP_BLOCKED]: 'AUTH_ABUSE_IP_BLOCKED',
  };

  return m1AuthAbusePolicyManifest.thresholds.find((t) => t.errorCode === levelToErrorCode[level]);
};
