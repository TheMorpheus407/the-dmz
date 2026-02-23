import { z } from 'zod';

export const logEventCategorySchema = z.enum([
  'request_received',
  'request_completed',
  'auth_success',
  'auth_failure',
  'tenant_context_failure',
  'dependency_ready',
  'dependency_degraded',
]);

export type LogEventCategory = z.infer<typeof logEventCategorySchema>;

export const logLevelSemanticsSchema = z.object({
  info: z.array(z.number()).describe('Status codes that should log at info level'),
  warn: z.array(z.number()).describe('Status codes that should log at warn level'),
  error: z.array(z.number()).describe('Status codes that should log at error level'),
});

export type LogLevelSemantics = z.infer<typeof logLevelSemanticsSchema>;

export const requiredLogFieldSchema = z.object({
  field: z.string(),
  description: z.string(),
  requiredForEvents: z.array(logEventCategorySchema),
});

export type RequiredLogField = z.infer<typeof requiredLogFieldSchema>;

export const redactionPathSchema = z.object({
  path: z.string(),
  description: z.string(),
  keyPatterns: z.array(z.string()),
});

export type RedactionPath = z.infer<typeof redactionPathSchema>;

export const loggingContractManifestSchema = z.object({
  version: z.string(),
  eventCategories: z.array(logEventCategorySchema),
  requiredFields: z.array(requiredLogFieldSchema),
  levelSemantics: logLevelSemanticsSchema,
  redactionPaths: z.array(redactionPathSchema),
  serviceMetadata: z.object({
    name: z.string(),
    environmentKey: z.string(),
    versionKey: z.string(),
  }),
});

export type LoggingContractManifest = z.infer<typeof loggingContractManifestSchema>;

export const LOG_REDACTION_KEYS = [
  'authorization',
  'cookie',
  'password',
  'passwordConfirm',
  'token',
  'refreshToken',
  'accessToken',
  'refresh_token',
  'access_token',
  'mfaCode',
  'mfa_code',
  'verificationCode',
  'verification_code',
  'code',
  'secret',
  'clientSecret',
  'client_secret',
  'x_refresh_token',
  'x-api-key',
  'x-api-key',
  'set-cookie',
] as const;

export type LogRedactionKey = (typeof LOG_REDACTION_KEYS)[number];

export const m1LoggingContractManifest: LoggingContractManifest = {
  version: '1.0.0',
  eventCategories: [
    'request_received',
    'request_completed',
    'auth_success',
    'auth_failure',
    'tenant_context_failure',
    'dependency_ready',
    'dependency_degraded',
  ],
  requiredFields: [
    {
      field: 'requestId',
      description: 'Unique identifier for the request',
      requiredForEvents: [
        'request_received',
        'request_completed',
        'auth_failure',
        'tenant_context_failure',
      ],
    },
    {
      field: 'method',
      description: 'HTTP method',
      requiredForEvents: ['request_received', 'request_completed'],
    },
    {
      field: 'url',
      description: 'Request URL or route',
      requiredForEvents: ['request_received', 'request_completed'],
    },
    {
      field: 'statusCode',
      description: 'HTTP response status code',
      requiredForEvents: ['request_completed'],
    },
    {
      field: 'durationMs',
      description: 'Request duration in milliseconds',
      requiredForEvents: ['request_completed'],
    },
    {
      field: 'ip',
      description: 'Client IP address',
      requiredForEvents: ['request_received', 'request_completed'],
    },
    {
      field: 'userAgent',
      description: 'Client user agent',
      requiredForEvents: ['request_received', 'request_completed'],
    },
    {
      field: 'tenantId',
      description: 'Tenant identifier (when available)',
      requiredForEvents: [
        'request_received',
        'request_completed',
        'auth_success',
        'auth_failure',
        'tenant_context_failure',
      ],
    },
    {
      field: 'userId',
      description: 'User identifier (when available)',
      requiredForEvents: ['request_received', 'request_completed', 'auth_success', 'auth_failure'],
    },
    {
      field: 'service',
      description: 'Service metadata (name, version, environment)',
      requiredForEvents: ['request_received', 'request_completed'],
    },
    {
      field: 'event',
      description: 'Event category/type',
      requiredForEvents: ['request_received', 'request_completed'],
    },
  ],
  levelSemantics: {
    info: [200, 201, 204],
    warn: [400, 401, 403, 404, 409, 422, 429],
    error: [500, 502, 503, 504],
  },
  redactionPaths: [
    {
      path: 'req.headers.authorization',
      description: 'Authorization header',
      keyPatterns: ['authorization'],
    },
    {
      path: 'req.headers.cookie',
      description: 'Cookie header',
      keyPatterns: ['cookie'],
    },
    {
      path: 'req.headers.x-api-key',
      description: 'API key header',
      keyPatterns: ['x-api-key', 'x-api-key'],
    },
    {
      path: 'req.headers.x_refresh_token',
      description: 'Refresh token header',
      keyPatterns: ['x_refresh_token'],
    },
    {
      path: 'req.body.password',
      description: 'Password in request body',
      keyPatterns: ['password'],
    },
    {
      path: 'req.body.passwordConfirm',
      description: 'Password confirmation in request body',
      keyPatterns: ['passwordConfirm'],
    },
    {
      path: 'req.body.token',
      description: 'Token in request body',
      keyPatterns: ['token'],
    },
    {
      path: 'req.body.refreshToken',
      description: 'Refresh token in request body',
      keyPatterns: ['refreshToken'],
    },
    {
      path: 'req.body.accessToken',
      description: 'Access token in request body',
      keyPatterns: ['accessToken'],
    },
    {
      path: 'req.body.mfaCode',
      description: 'MFA code in request body',
      keyPatterns: ['mfaCode', 'mfa_code'],
    },
    {
      path: 'req.body.verificationCode',
      description: 'Verification code in request body',
      keyPatterns: ['verificationCode', 'verification_code'],
    },
    {
      path: 'req.body.secret',
      description: 'Secret in request body',
      keyPatterns: ['secret'],
    },
    {
      path: 'response.headers.authorization',
      description: 'Authorization in response headers',
      keyPatterns: ['authorization'],
    },
    {
      path: 'response.headers.set-cookie',
      description: 'Set-Cookie header in response',
      keyPatterns: ['set-cookie'],
    },
  ],
  serviceMetadata: {
    name: 'the-dmz-api',
    environmentKey: 'environment',
    versionKey: 'version',
  },
} as const;

export type M1LoggingContractManifest = typeof m1LoggingContractManifest;

export const requiredRequestLogFields = [
  'requestId',
  'method',
  'url',
  'ip',
  'userAgent',
  'service',
  'event',
] as const;

export const requiredResponseLogFields = [
  'requestId',
  'method',
  'url',
  'statusCode',
  'durationMs',
  'ip',
  'userAgent',
  'service',
  'event',
] as const;

export const optionalContextLogFields = ['tenantId', 'userId'] as const;
