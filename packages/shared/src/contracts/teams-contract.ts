import { z } from 'zod';

export const TeamsDeliveryMode = {
  TEAMS_APP: 'teams-app',
  INCOMING_WEBHOOK: 'incoming-webhook',
} as const;

export type TeamsDeliveryMode = (typeof TeamsDeliveryMode)[keyof typeof TeamsDeliveryMode];

export const teamsDeliveryModeSchema = z.enum([
  TeamsDeliveryMode.TEAMS_APP,
  TeamsDeliveryMode.INCOMING_WEBHOOK,
]);

export const TeamsOperationType = {
  NOTIFICATION: 'notification',
  ADAPTIVE_CARD: 'adaptive_card',
  WEBHOOK_FALLBACK: 'webhook_fallback',
} as const;

export type TeamsOperationType = (typeof TeamsOperationType)[keyof typeof TeamsOperationType];

export const teamsOperationTypeSchema = z.enum([
  TeamsOperationType.NOTIFICATION,
  TeamsOperationType.ADAPTIVE_CARD,
  TeamsOperationType.WEBHOOK_FALLBACK,
]);

export const TEAMS_INTEGRATION_VERSION = '1.0.0';
export const TEAMS_COMPATIBILITY_NOTES =
  'Requires OAuth2 client credentials with teams scopes. Supports Bot Framework v4 for app mode and incoming webhooks for fallback mode.';

export const teamsIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedDeliveryModes: z.array(teamsDeliveryModeSchema),
  supportedOperations: z.array(teamsOperationTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
    requiresChannelBinding: z.boolean(),
  }),
});

export type TeamsIntegrationMetadata = z.infer<typeof teamsIntegrationMetadataSchema>;

export const teamsChannelBindingSchema = z.object({
  tenantId: z.string().uuid(),
  channelId: z.string().max(100).optional(),
  recipientId: z.string().uuid().optional(),
  recipientType: z.enum(['user', 'channel', 'group']).default('user'),
});

export type TeamsChannelBinding = z.infer<typeof teamsChannelBindingSchema>;

export const teamsOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  channelBinding: teamsChannelBindingSchema,
  idempotencyKey: z.string().max(255).optional(),
});

export type TeamsOperationInput = z.infer<typeof teamsOperationInputSchema>;

export const teamsOperationOutputSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  metadata: z
    .object({
      idempotencyKey: z.string().optional(),
      tenantId: z.string().uuid(),
      timestamp: z.string().datetime(),
      operationType: teamsOperationTypeSchema,
      deliveryMode: teamsDeliveryModeSchema,
    })
    .optional(),
});

export type TeamsOperationOutput = z.infer<typeof teamsOperationOutputSchema>;

export const TEAMS_ERROR_CODES = {
  INVALID_INPUT: 'TEAMS_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'TEAMS_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'TEAMS_TENANT_MISMATCH',
  CHANNEL_NOT_FOUND: 'TEAMS_CHANNEL_NOT_FOUND',
  RECIPIENT_NOT_FOUND: 'TEAMS_RECIPIENT_NOT_FOUND',
  WEBHOOK_REVOKED: 'TEAMS_WEBHOOK_REVOKED',
  WEBHOOK_PERMISSION_DENIED: 'TEAMS_WEBHOOK_PERMISSION_DENIED',
  IDEMPOTENCY_CONFLICT: 'TEAMS_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'TEAMS_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'TEAMS_AUTH_FAILED',
  CARD_EXPIRED: 'TEAMS_CARD_EXPIRED',
  CARD_INVALID: 'TEAMS_CARD_INVALID',
  DEFERRED: 'TEAMS_DEFERRED',
} as const;

export type TeamsErrorCode = (typeof TEAMS_ERROR_CODES)[keyof typeof TEAMS_ERROR_CODES];

export const TeamsNotificationSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export type TeamsNotificationSeverity =
  (typeof TeamsNotificationSeverity)[keyof typeof TeamsNotificationSeverity];

export const teamsNotificationSeveritySchema = z.enum([
  TeamsNotificationSeverity.CRITICAL,
  TeamsNotificationSeverity.HIGH,
  TeamsNotificationSeverity.MEDIUM,
  TeamsNotificationSeverity.LOW,
  TeamsNotificationSeverity.INFO,
]);

export const TEAMS_NOTIFICATION_KEYS = [
  'user_created',
  'user_updated',
  'user_deactivated',
  'session_created',
  'session_revoked',
  'login_failed',
  'login_success',
  'mfa_enabled',
  'mfa_disabled',
  'password_changed',
  'password_reset_requested',
  'tenant_created',
  'tenant_updated',
  'training_assigned',
  'training_completed',
  'training_overdue',
  'report_ready',
] as const;

export type TeamsNotificationKey = (typeof TEAMS_NOTIFICATION_KEYS)[number];

export const teamsNotificationPayloadSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  severity: teamsNotificationSeveritySchema,
  templateKey: z.string(),
  templateLabel: z.string(),
  recipientId: z.string().uuid().optional(),
  recipientName: z.string().optional(),
  deepLinkTarget: z.string().url().optional(),
  data: z.record(z.unknown()),
});

export type TeamsNotificationPayload = z.infer<typeof teamsNotificationPayloadSchema>;

export const teamsNotificationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  templateKey: z.string(),
  eventType: z.string(),
  requiredPayloadFields: z.array(z.string()),
  forbiddenPayloadFields: z.array(z.string()),
  requiredScopes: z.array(z.string()),
  deliveryModes: z.array(teamsDeliveryModeSchema),
  severity: teamsNotificationSeveritySchema,
  supportsAdaptiveCard: z.boolean(),
  adaptiveCardVersion: z.string().optional(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type TeamsNotificationContract = z.infer<typeof teamsNotificationContractSchema>;

export const TEAMS_ADAPTIVE_CARD_VERSION = '1.4';
export const TEAMS_ADAPTIVE_CARD_REQUIRED_FIELDS = [
  '$schema',
  'type',
  'version',
  'body',
  'actions',
] as const;

export const TeamsAdaptiveCardActionType = {
  ACKNOWLEDGE: 'teamsAcknowledge',
  VIEW_DETAILS: 'teamsViewDetails',
  OPEN_REPORT: 'teamsOpenReport',
  OPEN_TRAINING: 'teamsOpenTraining',
  CUSTOM: 'custom',
} as const;

export type TeamsAdaptiveCardActionType =
  (typeof TeamsAdaptiveCardActionType)[keyof typeof TeamsAdaptiveCardActionType];

export const teamsAdaptiveCardActionSchema = z
  .object({
    type: z.literal(TeamsAdaptiveCardActionType.ACKNOWLEDGE),
    id: z.string(),
    title: z.string(),
  })
  .or(
    z.object({
      type: z.literal(TeamsAdaptiveCardActionType.VIEW_DETAILS),
      id: z.string(),
      title: z.string(),
      targetUrl: z.string().url(),
    }),
  )
  .or(
    z.object({
      type: z.literal(TeamsAdaptiveCardActionType.OPEN_REPORT),
      id: z.string(),
      title: z.string(),
      reportId: z.string().uuid(),
    }),
  )
  .or(
    z.object({
      type: z.literal(TeamsAdaptiveCardActionType.OPEN_TRAINING),
      id: z.string(),
      title: z.string(),
      trainingId: z.string().uuid(),
    }),
  )
  .or(
    z.object({
      type: z.literal(TeamsAdaptiveCardActionType.CUSTOM),
      id: z.string(),
      title: z.string(),
      data: z.record(z.unknown()),
    }),
  );

export type TeamsAdaptiveCardAction = z.infer<typeof teamsAdaptiveCardActionSchema>;

export const teamsAdaptiveCardCallbackPayloadSchema = z.object({
  actionType: z.string(),
  actionId: z.string(),
  cardId: z.string().uuid(),
  interactionTimestamp: z.string().datetime(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  payload: z.record(z.unknown()),
});

export type TeamsAdaptiveCardCallbackPayload = z.infer<
  typeof teamsAdaptiveCardCallbackPayloadSchema
>;

export const teamsAdaptiveCardSchema = z.object({
  $schema: z.string().default('http://adaptivecards.io/schemas/adaptive-card.json'),
  type: z.literal('AdaptiveCard'),
  version: z.string(),
  body: z.array(z.record(z.unknown())),
  actions: z.array(teamsAdaptiveCardActionSchema),
  msTeams: z
    .object({
      width: z.string().optional(),
      height: z.string().optional(),
    })
    .optional(),
});

export type TeamsAdaptiveCard = z.infer<typeof teamsAdaptiveCardSchema>;

export const teamsWebhookFallbackSchema = z
  .object({
    webhookUrl: z.string().url(),
    payload: teamsNotificationPayloadSchema,
    retryPolicy: z
      .object({
        maxAttempts: z.number().int().positive(),
        retryDelaysMs: z.array(z.number().int()),
      })
      .optional(),
  })
  .transform((val) => ({
    ...val,
    retryPolicy: val.retryPolicy ?? {
      maxAttempts: 5,
      retryDelaysMs: [60000, 300000, 1800000, 7200000, 28800000],
    },
  }));

export type TeamsWebhookFallback = z.infer<typeof teamsWebhookFallbackSchema>;

export const teamsWebhookDeliverySchema = z.object({
  id: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  notificationKey: z.string(),
  tenantId: z.string().uuid(),
  channelBinding: teamsChannelBindingSchema,
  deliveryMode: teamsDeliveryModeSchema,
  status: z.enum(['pending', 'in_progress', 'success', 'failed', 'dlq']),
  attemptNumber: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  nextAttemptAt: z.string().datetime().optional(),
  lastAttemptAt: z.string().datetime().optional(),
  responseStatusCode: z.number().int().optional(),
  errorMessage: z.string().optional(),
  latencyMs: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TeamsWebhookDelivery = z.infer<typeof teamsWebhookDeliverySchema>;

export const TEAMS_RATE_LIMITS = {
  NOTIFICATIONS_PER_MINUTE: 30,
  NOTIFICATIONS_PER_HOUR: 500,
  ADAPTIVE_CARDS_PER_MINUTE: 20,
  ADAPTIVE_CARDS_PER_HOUR: 300,
  NON_CRITICAL_PER_USER_PER_DAY: 2,
} as const;

export const TEAMS_RETRY_DELAYS_MS = [60000, 300000, 1800000, 7200000, 28800000];
export const TEAMS_DEFAULT_MAX_ATTEMPTS = 5;

export const m1TeamsNotificationContractManifest: Record<
  TeamsNotificationKey,
  TeamsNotificationContract
> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Notification when a new user is created in the system',
    templateKey: 'userCreated',
    eventType: 'auth.user.created',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['password', 'passwordHash', 'resetToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.INFO,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  user_updated: {
    key: 'user_updated',
    label: 'User Updated',
    description: 'Notification when an existing user is updated',
    templateKey: 'userUpdated',
    eventType: 'auth.user.updated',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['password', 'passwordHash', 'resetToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.LOW,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  user_deactivated: {
    key: 'user_deactivated',
    label: 'User Deactivated',
    description: 'Notification when a user is deactivated',
    templateKey: 'userDeactivated',
    eventType: 'auth.user.deactivated',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['password', 'passwordHash', 'resetToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.MEDIUM,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  session_created: {
    key: 'session_created',
    label: 'Session Created',
    description: 'Notification when a user session is created',
    templateKey: 'sessionCreated',
    eventType: 'auth.session.created',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['sessionToken', 'accessToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP],
    severity: TeamsNotificationSeverity.LOW,
    supportsAdaptiveCard: false,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  session_revoked: {
    key: 'session_revoked',
    label: 'Session Revoked',
    description: 'Notification when a user session is revoked',
    templateKey: 'sessionRevoked',
    eventType: 'auth.session.revoked',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['sessionToken', 'accessToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.MEDIUM,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  login_failed: {
    key: 'login_failed',
    label: 'Login Failed',
    description: 'Notification when a login attempt fails',
    templateKey: 'loginFailed',
    eventType: 'auth.login.failed',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data', 'severity'],
    forbiddenPayloadFields: ['password', 'passwordHash'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.HIGH,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  login_success: {
    key: 'login_success',
    label: 'Login Success',
    description: 'Notification when a user logs in successfully',
    templateKey: 'loginSuccess',
    eventType: 'auth.login.success',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['password', 'passwordHash', 'sessionToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP],
    severity: TeamsNotificationSeverity.INFO,
    supportsAdaptiveCard: false,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  mfa_enabled: {
    key: 'mfa_enabled',
    label: 'MFA Enabled',
    description: 'Notification when a user enables multi-factor authentication',
    templateKey: 'mfaEnabled',
    eventType: 'auth.mfa_enabled',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['mfaSecret', 'mfaBackupCodes'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.HIGH,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  mfa_disabled: {
    key: 'mfa_disabled',
    label: 'MFA Disabled',
    description: 'Notification when a user disables multi-factor authentication',
    templateKey: 'mfaDisabled',
    eventType: 'auth.mfa_disabled',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['mfaSecret', 'mfaBackupCodes'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.HIGH,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  password_changed: {
    key: 'password_changed',
    label: 'Password Changed',
    description: 'Notification when a user changes their password',
    templateKey: 'passwordChanged',
    eventType: 'auth.password.changed',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['password', 'passwordHash', 'resetToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.MEDIUM,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  password_reset_requested: {
    key: 'password_reset_requested',
    label: 'Password Reset Requested',
    description: 'Notification when a password reset is requested',
    templateKey: 'passwordResetRequested',
    eventType: 'auth.password_reset.requested',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['password', 'passwordHash', 'resetToken'],
    requiredScopes: ['teams.notification', 'users:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.MEDIUM,
    supportsAdaptiveCard: false,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  tenant_created: {
    key: 'tenant_created',
    label: 'Tenant Created',
    description: 'Notification when a new tenant is created',
    templateKey: 'tenantCreated',
    eventType: 'enterprise.tenant.created',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: [],
    requiredScopes: ['teams.notification', 'admin:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.INFO,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  tenant_updated: {
    key: 'tenant_updated',
    label: 'Tenant Updated',
    description: 'Notification when a tenant is updated',
    templateKey: 'tenantUpdated',
    eventType: 'enterprise.tenant.updated',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: [],
    requiredScopes: ['teams.notification', 'admin:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.LOW,
    supportsAdaptiveCard: false,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  training_assigned: {
    key: 'training_assigned',
    label: 'Training Assigned',
    description: 'Notification when a training is assigned to a user',
    templateKey: 'trainingAssigned',
    eventType: 'training.assigned',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data', 'deepLinkTarget'],
    forbiddenPayloadFields: [],
    requiredScopes: ['teams.notification', 'admin:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.MEDIUM,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  training_completed: {
    key: 'training_completed',
    label: 'Training Completed',
    description: 'Notification when a user completes a training',
    templateKey: 'trainingCompleted',
    eventType: 'training.completed',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: [],
    requiredScopes: ['teams.notification', 'admin:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.INFO,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  training_overdue: {
    key: 'training_overdue',
    label: 'Training Overdue',
    description: 'Notification when a training assignment is overdue',
    templateKey: 'trainingOverdue',
    eventType: 'training.overdue',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data', 'deepLinkTarget'],
    forbiddenPayloadFields: [],
    requiredScopes: ['teams.notification', 'admin:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.HIGH,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
  report_ready: {
    key: 'report_ready',
    label: 'Report Ready',
    description: 'Notification when a report is ready for download',
    templateKey: 'reportReady',
    eventType: 'report.ready',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data', 'deepLinkTarget'],
    forbiddenPayloadFields: [],
    requiredScopes: ['teams.notification', 'admin:read'],
    deliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
    severity: TeamsNotificationSeverity.INFO,
    supportsAdaptiveCard: true,
    adaptiveCardVersion: TEAMS_ADAPTIVE_CARD_VERSION,
    version: TEAMS_INTEGRATION_VERSION,
    deprecated: false,
  },
} as const;

export const m1TeamsIntegrationManifest: TeamsIntegrationMetadata = {
  integrationVersion: TEAMS_INTEGRATION_VERSION,
  compatibilityNotes: TEAMS_COMPATIBILITY_NOTES,
  supportedDeliveryModes: [TeamsDeliveryMode.TEAMS_APP, TeamsDeliveryMode.INCOMING_WEBHOOK],
  supportedOperations: [
    TeamsOperationType.NOTIFICATION,
    TeamsOperationType.ADAPTIVE_CARD,
    TeamsOperationType.WEBHOOK_FALLBACK,
  ],
  authRequirements: {
    oauthScopes: ['teams.read', 'teams.write', 'teams.notification', 'teams.adaptive_card'],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
    requiresChannelBinding: true,
  },
};

export const isValidTeamsNotificationKey = (key: string): key is TeamsNotificationKey => {
  return TEAMS_NOTIFICATION_KEYS.includes(key as TeamsNotificationKey);
};

export const isValidDeliveryMode = (mode: string): mode is TeamsDeliveryMode => {
  return mode === TeamsDeliveryMode.TEAMS_APP || mode === TeamsDeliveryMode.INCOMING_WEBHOOK;
};

export const getNotificationContract = (key: TeamsNotificationKey): TeamsNotificationContract => {
  return m1TeamsNotificationContractManifest[key];
};

export const getAllTeamsNotificationContracts = (): TeamsNotificationContract[] => {
  return Object.values(m1TeamsNotificationContractManifest);
};

export const validateTeamsNotificationInput = (
  notificationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (!isValidTeamsNotificationKey(notificationKey)) {
    return { valid: false, errors: undefined };
  }
  const result = teamsNotificationPayloadSchema.safeParse(input);
  return { valid: result.success, errors: result.error };
};

export const validateAdaptiveCardCallback = (
  payload: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  const result = teamsAdaptiveCardCallbackPayloadSchema.safeParse(payload);
  return { valid: result.success, errors: result.error };
};

export const buildTeamsErrorResponse = (
  code: TeamsErrorCode,
  message: string,
  operationType: TeamsOperationType,
  deliveryMode: TeamsDeliveryMode,
  tenantId: string,
): TeamsOperationOutput => ({
  success: false,
  error: { code, message },
  metadata: {
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    deliveryMode,
  },
});

export const buildTeamsSuccessResponse = (
  data: Record<string, unknown>,
  operationType: TeamsOperationType,
  deliveryMode: TeamsDeliveryMode,
  tenantId: string,
  idempotencyKey?: string,
): TeamsOperationOutput => ({
  success: true,
  data,
  metadata: {
    idempotencyKey,
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    deliveryMode,
  },
});

export const getTeamsRetryDelayMs = (attemptNumber: number): number => {
  const index = Math.min(attemptNumber - 1, TEAMS_RETRY_DELAYS_MS.length - 1);
  return TEAMS_RETRY_DELAYS_MS[index]!;
};

const RETRYABLE_ERROR_CODES: readonly TeamsErrorCode[] = [
  TEAMS_ERROR_CODES.DEFERRED,
  TEAMS_ERROR_CODES.RATE_LIMIT_EXCEEDED,
];

const TERMINAL_ERROR_CODES: readonly TeamsErrorCode[] = [
  TEAMS_ERROR_CODES.WEBHOOK_REVOKED,
  TEAMS_ERROR_CODES.WEBHOOK_PERMISSION_DENIED,
  TEAMS_ERROR_CODES.TENANT_MISMATCH,
  TEAMS_ERROR_CODES.CHANNEL_NOT_FOUND,
  TEAMS_ERROR_CODES.RECIPIENT_NOT_FOUND,
];

export const isRetryableError = (code: string): boolean => {
  return RETRYABLE_ERROR_CODES.includes(code as TeamsErrorCode);
};

export const isTerminalError = (code: string): boolean => {
  return TERMINAL_ERROR_CODES.includes(code as TeamsErrorCode);
};
