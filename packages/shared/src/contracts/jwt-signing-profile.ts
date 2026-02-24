import { z } from 'zod';

export const JWT_SIGNING_ALGORITHM = {
  RS256: 'RS256',
  ES256: 'ES256',
} as const;

export type JWTSigningAlgorithm =
  (typeof JWT_SIGNING_ALGORITHM)[keyof typeof JWT_SIGNING_ALGORITHM];

export const jwtSigningAlgorithmSchema = z.enum([
  JWT_SIGNING_ALGORITHM.RS256,
  JWT_SIGNING_ALGORITHM.ES256,
]);

export const KEY_STATUS = {
  ACTIVE: 'active',
  ROTATING: 'rotating',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export type KeyStatus = (typeof KEY_STATUS)[keyof typeof KEY_STATUS];

export const keyStatusSchema = z.enum([
  KEY_STATUS.ACTIVE,
  KEY_STATUS.ROTATING,
  KEY_STATUS.REVOKED,
  KEY_STATUS.EXPIRED,
]);

export const KEY_TYPE = {
  RSA: 'RSA',
  EC: 'EC',
} as const;

export type KeyType = (typeof KEY_TYPE)[keyof typeof KEY_TYPE];

export const keyTypeSchema = z.enum([KEY_TYPE.RSA, KEY_TYPE.EC]);

export const jwtHeaderSchema = z.object({
  alg: jwtSigningAlgorithmSchema.describe('JWT signing algorithm'),
  typ: z.literal('JWT').describe('Token type'),
  kid: z.string().describe('Key ID for key lookup'),
});

export type JWTHeader = z.infer<typeof jwtHeaderSchema>;

export const jwtClaimsSchema = z.object({
  iss: z.string().describe('Issuer'),
  aud: z.string().describe('Audience'),
  sub: z.string().describe('Subject (user ID)'),
  tenantId: z.string().describe('Tenant context'),
  sessionId: z.string().describe('Session reference'),
  role: z.string().describe('User role'),
  iat: z.number().describe('Issued at timestamp'),
  exp: z.number().describe('Expiration timestamp'),
});

export type JWTClaims = z.infer<typeof jwtClaimsSchema>;

export const jwkSchema = z.object({
  kty: keyTypeSchema.describe('Key type'),
  kid: z.string().describe('Key ID'),
  use: z.literal('sig').describe('Key usage (signature)'),
  alg: jwtSigningAlgorithmSchema.describe('Algorithm for this key'),
  n: z.string().optional().describe('RSA modulus (base64url)'),
  e: z.string().optional().describe('RSA exponent (base64url)'),
  crv: z.string().optional().describe('EC curve'),
  x: z.string().optional().describe('EC X coordinate'),
  y: z.string().optional().describe('EC Y coordinate'),
});

export type JWK = z.infer<typeof jwkSchema>;

export const jwksDocumentSchema = z.object({
  keys: z.array(jwkSchema).describe('Array of JWKs'),
});

export type JWKSDocument = z.infer<typeof jwksDocumentSchema>;

export const JWT_ERROR_CODES = {
  AUTH_JWT_INVALID_KEY_ID: 'AUTH_JWT_INVALID_KEY_ID',
  AUTH_JWT_KEY_REVOKED: 'AUTH_JWT_KEY_REVOKED',
  AUTH_JWT_KEY_EXPIRED: 'AUTH_JWT_KEY_EXPIRED',
  AUTH_JWT_ALGORITHM_MISMATCH: 'AUTH_JWT_ALGORITHM_MISMATCH',
  AUTH_JWT_INVALID_TOKEN: 'AUTH_JWT_INVALID_TOKEN',
  AUTH_JWT_MISSING_KEY_ID: 'AUTH_JWT_MISSING_KEY_ID',
  AUTH_JWK_NOT_FOUND: 'AUTH_JWK_NOT_FOUND',
  AUTH_JWT_SIGNING_ERROR: 'AUTH_JWT_SIGNING_ERROR',
} as const;

export type JWTErrorCode = (typeof JWT_ERROR_CODES)[keyof typeof JWT_ERROR_CODES];

export const jwtKeyRotationConfigSchema = z.object({
  keyRotationIntervalDays: z.number().int().positive().default(90),
  gracePeriodHours: z.number().int().positive().default(24),
  maxActiveKeys: z.number().int().positive().default(2),
});

export type JWTKeyRotationConfig = z.infer<typeof jwtKeyRotationConfigSchema>;

export const jwtSigningProfileManifestSchema = z.object({
  version: z.string().describe('Contract version'),
  allowedAlgorithms: z.array(jwtSigningAlgorithmSchema).describe('Allowed signing algorithms'),
  primaryAlgorithm: jwtSigningAlgorithmSchema.describe('Primary/default algorithm'),
  headerRequirements: jwtHeaderSchema.describe('Required JWT header fields'),
  claimsRequirements: jwtClaimsSchema.describe('Required JWT claims'),
  keyRotation: jwtKeyRotationConfigSchema.describe('Key rotation configuration'),
  cacheControlMaxAge: z.number().int().positive().describe('JWKS cache-control max-age (seconds)'),
  errorContract: z.object({
    errorCodes: z.record(z.string(), z.string()).describe('Error codes mapping'),
    requiredDetails: z.array(z.string()).describe('Required fields in error details'),
  }),
});

export type JWTSigningProfileManifest = z.infer<typeof jwtSigningProfileManifestSchema>;

export const m1JWTSigningProfileManifest: JWTSigningProfileManifest = {
  version: '1.0.0',
  allowedAlgorithms: [JWT_SIGNING_ALGORITHM.RS256, JWT_SIGNING_ALGORITHM.ES256],
  primaryAlgorithm: JWT_SIGNING_ALGORITHM.RS256,
  headerRequirements: {
    alg: JWT_SIGNING_ALGORITHM.RS256,
    typ: 'JWT',
    kid: '',
  },
  claimsRequirements: {
    iss: '',
    aud: '',
    sub: '',
    tenantId: '',
    sessionId: '',
    role: '',
    iat: 0,
    exp: 0,
  },
  keyRotation: {
    keyRotationIntervalDays: 90,
    gracePeriodHours: 24,
    maxActiveKeys: 2,
  },
  cacheControlMaxAge: 3600,
  errorContract: {
    errorCodes: {
      AUTH_JWT_INVALID_KEY_ID: 'Token contains unknown or invalid key ID',
      AUTH_JWT_KEY_REVOKED: 'Token was signed with a revoked key',
      AUTH_JWT_KEY_EXPIRED: 'Token was signed with an expired key',
      AUTH_JWT_ALGORITHM_MISMATCH: 'Token algorithm does not match key algorithm',
      AUTH_JWT_INVALID_TOKEN: 'Token is invalid or malformed',
      AUTH_JWT_MISSING_KEY_ID: 'Token is missing required key ID header',
      AUTH_JWK_NOT_FOUND: 'No valid signing key found',
      AUTH_JWT_SIGNING_ERROR: 'Failed to sign token',
    },
    requiredDetails: ['kid', 'reason'],
  },
} as const;

export type M1JWTSigningProfile = typeof m1JWTSigningProfileManifest;
