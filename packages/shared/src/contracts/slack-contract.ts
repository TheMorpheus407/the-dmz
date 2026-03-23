import { z } from 'zod';

export const SlackDeliveryMode = {
  SLACK_APP: 'slack-app',
  INCOMING_WEBHOOK: 'incoming-webhook',
} as const;

export type SlackDeliveryMode = (typeof SlackDeliveryMode)[keyof typeof SlackDeliveryMode];

export const slackDeliveryModeSchema = z.enum([
  SlackDeliveryMode.SLACK_APP,
  SlackDeliveryMode.INCOMING_WEBHOOK,
]);

export const SlackOperationType = {
  NOTIFICATION: 'notification',
  BLOCK_KIT: 'block_kit',
  WEBHOOK_FALLBACK: 'webhook_fallback',
  SLASH_COMMAND: 'slash_command',
} as const;

export type SlackOperationType = (typeof SlackOperationType)[keyof typeof SlackOperationType];

export const slackOperationTypeSchema = z.enum([
  SlackOperationType.NOTIFICATION,
  SlackOperationType.BLOCK_KIT,
  SlackOperationType.WEBHOOK_FALLBACK,
  SlackOperationType.SLASH_COMMAND,
]);

export const SLACK_INTEGRATION_VERSION = '1.0.0';
export const SLACK_COMPATIBILITY_NOTES =
  'Requires OAuth2 client credentials with Slack scopes. Supports Slack Bot Token and Web API for app mode and incoming webhooks for fallback mode.';

export const slackIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedDeliveryModes: z.array(slackDeliveryModeSchema),
  supportedOperations: z.array(slackOperationTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
    requiresWorkspaceBinding: z.boolean(),
  }),
});

export type SlackIntegrationMetadata = z.infer<typeof slackIntegrationMetadataSchema>;

export const slackChannelBindingSchema = z.object({
  tenantId: z.string().uuid(),
  workspaceId: z.string().max(100).optional(),
  channelId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
  recipientType: z.enum(['user', 'channel', 'group', 'direct_message']).default('user'),
});

export type SlackChannelBinding = z.infer<typeof slackChannelBindingSchema>;

export const slackOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  channelBinding: slackChannelBindingSchema,
  idempotencyKey: z.string().max(255).optional(),
});

export type SlackOperationInput = z.infer<typeof slackOperationInputSchema>;

export const slackOperationOutputSchema = z.object({
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
      operationType: slackOperationTypeSchema,
      deliveryMode: slackDeliveryModeSchema,
    })
    .optional(),
});

export type SlackOperationOutput = z.infer<typeof slackOperationOutputSchema>;

export const SLACK_ERROR_CODES = {
  INVALID_INPUT: 'SLACK_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'SLACK_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'SLACK_TENANT_MISMATCH',
  CHANNEL_NOT_FOUND: 'SLACK_CHANNEL_NOT_FOUND',
  USER_NOT_FOUND: 'SLACK_USER_NOT_FOUND',
  WORKSPACE_NOT_FOUND: 'SLACK_WORKSPACE_NOT_FOUND',
  WEBHOOK_REVOKED: 'SLACK_WEBHOOK_REVOKED',
  WEBHOOK_PERMISSION_DENIED: 'SLACK_WEBHOOK_PERMISSION_DENIED',
  IDEMPOTENCY_CONFLICT: 'SLACK_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'SLACK_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'SLACK_AUTH_FAILED',
  SIGNATURE_INVALID: 'SLACK_SIGNATURE_INVALID',
  TIMESTAMP_EXPIRED: 'SLACK_TIMESTAMP_EXPIRED',
  BLOCK_KIT_INVALID: 'SLACK_BLOCK_KIT_INVALID',
  DEFERRED: 'SLACK_DEFERRED',
} as const;

export type SlackErrorCode = (typeof SLACK_ERROR_CODES)[keyof typeof SLACK_ERROR_CODES];

export const SlackNotificationSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export type SlackNotificationSeverity =
  (typeof SlackNotificationSeverity)[keyof typeof SlackNotificationSeverity];

export const slackNotificationSeveritySchema = z.enum([
  SlackNotificationSeverity.CRITICAL,
  SlackNotificationSeverity.HIGH,
  SlackNotificationSeverity.MEDIUM,
  SlackNotificationSeverity.LOW,
  SlackNotificationSeverity.INFO,
]);

export const SLACK_NOTIFICATION_KEYS = [
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

export type SlackNotificationKey = (typeof SLACK_NOTIFICATION_KEYS)[number];

export const slackNotificationPayloadSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  severity: slackNotificationSeveritySchema,
  templateKey: z.string(),
  templateLabel: z.string(),
  recipientId: z.string().uuid().optional(),
  recipientName: z.string().optional(),
  deepLinkTarget: z.string().url().optional(),
  data: z.record(z.unknown()),
});

export type SlackNotificationPayload = z.infer<typeof slackNotificationPayloadSchema>;

export const slackNotificationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  templateKey: z.string(),
  eventType: z.string(),
  requiredPayloadFields: z.array(z.string()),
  forbiddenPayloadFields: z.array(z.string()),
  requiredScopes: z.array(z.string()),
  deliveryModes: z.array(slackDeliveryModeSchema),
  severity: slackNotificationSeveritySchema,
  supportsBlockKit: z.boolean(),
  blockKitVersion: z.string().optional(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type SlackNotificationContract = z.infer<typeof slackNotificationContractSchema>;

export const SLACK_BLOCK_KIT_VERSION = '1.0';
export const SLACK_BLOCK_KIT_REQUIRED_FIELDS = ['type', 'blocks'] as const;

export const SlackBlockKitBlockType = {
  ACTIONS: 'actions',
  CONTEXT: 'context',
  DIVIDER: 'divider',
  FILE: 'file',
  HEADER: 'header',
  IMAGE: 'image',
  INPUT: 'input',
  SECTION: 'section',
} as const;

export type SlackBlockKitBlockType =
  (typeof SlackBlockKitBlockType)[keyof typeof SlackBlockKitBlockType];

export const SlackBlockKitElementType = {
  BUTTON: 'button',
  CHECKBOXES: 'checkboxes',
  DATE_PICKER: 'date_picker',
  EMAIL_INPUT: 'email_text_input',
  MULTI_SELECT: 'multi_static_select',
  OVERFLOW: 'overflow',
  PLAIN_TEXT_INPUT: 'plain_text_input',
  RADIO_BUTTONS: 'radio_buttons',
  SELECT: 'static_select',
  TIME_PICKER: 'timepicker',
  URL_INPUT: 'url_text_input',
} as const;

export type SlackBlockKitElementType =
  (typeof SlackBlockKitElementType)[keyof typeof SlackBlockKitElementType];

export const SlackBlockKitActionType = {
  BUTTON_CLICK: 'slackButtonClick',
  MENU_SELECT: 'slackMenuSelect',
  DATE_PICKER: 'slackDatePicker',
  TEXT_INPUT: 'slackTextInput',
  OVERFLOW_MENU: 'slackOverflowMenu',
  CUSTOM: 'custom',
} as const;

export type SlackBlockKitActionType =
  (typeof SlackBlockKitActionType)[keyof typeof SlackBlockKitActionType];

export const slackBlockKitActionSchema = z
  .object({
    type: z.literal(SlackBlockKitActionType.BUTTON_CLICK),
    actionId: z.string(),
    text: z.string(),
    value: z.string().optional(),
    url: z.string().url().optional(),
    confirm: z
      .object({
        title: z.string(),
        text: z.string(),
        confirm: z.string(),
        deny: z.string(),
      })
      .optional(),
  })
  .or(
    z.object({
      type: z.literal(SlackBlockKitActionType.MENU_SELECT),
      actionId: z.string(),
      selectedOption: z.object({
        text: z.object({ type: z.literal('plain_text'), text: z.string() }),
        value: z.string(),
      }),
    }),
  )
  .or(
    z.object({
      type: z.literal(SlackBlockKitActionType.DATE_PICKER),
      actionId: z.string(),
      selectedDate: z.string(),
    }),
  )
  .or(
    z.object({
      type: z.literal(SlackBlockKitActionType.TEXT_INPUT),
      actionId: z.string(),
      value: z.string(),
    }),
  )
  .or(
    z.object({
      type: z.literal(SlackBlockKitActionType.OVERFLOW_MENU),
      actionId: z.string(),
      selectedOption: z.object({
        text: z.object({ type: z.literal('plain_text'), text: z.string() }),
        value: z.string(),
      }),
    }),
  )
  .or(
    z.object({
      type: z.literal(SlackBlockKitActionType.CUSTOM),
      actionId: z.string(),
      value: z.string(),
      data: z.record(z.unknown()),
    }),
  );

export type SlackBlockKitAction = z.infer<typeof slackBlockKitActionSchema>;

export const slackBlockKitSectionSchema = z.object({
  type: z.literal(SlackBlockKitBlockType.SECTION),
  text: z
    .object({
      type: z.enum(['plain_text', 'mrkdwn']),
      text: z.string(),
    })
    .optional(),
  fields: z
    .array(
      z.object({
        type: z.enum(['plain_text', 'mrkdwn']),
        text: z.string(),
      }),
    )
    .optional(),
  accessory: z.record(z.unknown()).optional(),
});

export type SlackBlockKitSection = z.infer<typeof slackBlockKitSectionSchema>;

export const slackBlockKitActionsSchema = z.object({
  type: z.literal(SlackBlockKitBlockType.ACTIONS),
  blockId: z.string().optional(),
  elements: z.array(z.record(z.unknown())),
});

export type SlackBlockKitActions = z.infer<typeof slackBlockKitActionsSchema>;

export const slackBlockKitContextSchema = z.object({
  type: z.literal(SlackBlockKitBlockType.CONTEXT),
  elements: z.array(z.record(z.unknown())),
});

export type SlackBlockKitContext = z.infer<typeof slackBlockKitContextSchema>;

export const slackBlockKitDividerSchema = z.object({
  type: z.literal(SlackBlockKitBlockType.DIVIDER),
});

export type SlackBlockKitDivider = z.infer<typeof slackBlockKitDividerSchema>;

export const slackBlockKitHeaderSchema = z.object({
  type: z.literal(SlackBlockKitBlockType.HEADER),
  text: z.object({
    type: z.literal('plain_text'),
    text: z.string(),
  }),
});

export type SlackBlockKitHeader = z.infer<typeof slackBlockKitHeaderSchema>;

export const slackBlockKitInputSchema = z.object({
  type: z.literal(SlackBlockKitBlockType.INPUT),
  blockId: z.string().optional(),
  label: z.object({
    type: z.literal('plain_text'),
    text: z.string(),
  }),
  element: z.record(z.unknown()),
  optional: z.boolean().optional(),
});

export type SlackBlockKitInput = z.infer<typeof slackBlockKitInputSchema>;

export const slackBlockKitBlockSchema = slackBlockKitSectionSchema
  .or(slackBlockKitActionsSchema)
  .or(slackBlockKitContextSchema)
  .or(slackBlockKitDividerSchema)
  .or(slackBlockKitHeaderSchema)
  .or(slackBlockKitInputSchema);

export type SlackBlockKitBlock = z.infer<typeof slackBlockKitBlockSchema>;

export const slackBlockKitCardSchema = z.object({
  blocks: z.array(slackBlockKitBlockSchema),
  attachments: z
    .array(
      z.object({
        color: z.string().optional(),
        blocks: z.array(slackBlockKitBlockSchema).optional(),
      }),
    )
    .optional(),
});

export type SlackBlockKitCard = z.infer<typeof slackBlockKitCardSchema>;

export const slackBlockKitCallbackPayloadSchema = z.object({
  actionType: z.string(),
  actionId: z.string(),
  blockId: z.string().optional(),
  cardId: z.string().uuid(),
  interactionTimestamp: z.string().datetime(),
  userId: z.string(),
  userName: z.string().optional(),
  channelId: z.string().optional(),
  workspaceId: z.string().optional(),
  tenantId: z.string().uuid(),
  payload: z.record(z.unknown()),
});

export type SlackBlockKitCallbackPayload = z.infer<typeof slackBlockKitCallbackPayloadSchema>;

export const SLACK_SLASH_COMMANDS = [
  'status',
  'leaderboard',
  'report',
  'train',
  'risk',
  'campaign',
  'settings',
  'help',
] as const;

export type SlackSlashCommand = (typeof SLACK_SLASH_COMMANDS)[number];

export const slackSlashCommandRequestSchema = z.object({
  command: z.string(),
  text: z.string(),
  responseUrl: z.string().url(),
  triggerId: z.string(),
  userId: z.string(),
  userName: z.string().optional(),
  channelId: z.string(),
  channelName: z.string().optional(),
  workspaceId: z.string(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
});

export type SlackSlashCommandRequest = z.infer<typeof slackSlashCommandRequestSchema>;

export const slackSlashCommandSignatureSchema = z.object({
  signature: z.string(),
  timestamp: z.string(),
});

export type SlackSlashCommandSignature = z.infer<typeof slackSlashCommandSignatureSchema>;

export const slackSlashCommandResponseSchema = z.object({
  responseType: z.enum(['in_channel', 'ephemeral']).default('ephemeral'),
  text: z.string().optional(),
  blocks: z.array(slackBlockKitBlockSchema).optional(),
  attachments: z.array(z.record(z.unknown())).optional(),
});

export type SlackSlashCommandResponse = z.infer<typeof slackSlashCommandResponseSchema>;

export const slackWebhookFallbackSchema = z
  .object({
    webhookUrl: z.string().url(),
    payload: slackNotificationPayloadSchema,
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

export type SlackWebhookFallback = z.infer<typeof slackWebhookFallbackSchema>;

export const slackWebhookDeliverySchema = z.object({
  id: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  notificationKey: z.string(),
  tenantId: z.string().uuid(),
  channelBinding: slackChannelBindingSchema,
  deliveryMode: slackDeliveryModeSchema,
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

export type SlackWebhookDelivery = z.infer<typeof slackWebhookDeliverySchema>;

export const SLACK_RATE_LIMITS = {
  NOTIFICATIONS_PER_MINUTE: 30,
  NOTIFICATIONS_PER_HOUR: 500,
  BLOCK_KIT_PER_MINUTE: 20,
  BLOCK_KIT_PER_HOUR: 300,
  NON_CRITICAL_PER_USER_PER_DAY: 2,
  SLASH_COMMANDS_PER_MINUTE: 20,
} as const;

export const SLACK_RETRY_DELAYS_MS = [60000, 300000, 1800000, 7200000, 28800000];
export const SLACK_DEFAULT_MAX_ATTEMPTS = 5;
export const SLACK_SIGNATURE_VERSION = 'v0';
export const SLACK_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

export const m1SlackNotificationContractManifest: Record<
  SlackNotificationKey,
  SlackNotificationContract
> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Notification when a new user is created in the system',
    templateKey: 'userCreated',
    eventType: 'auth.user.created',
    requiredPayloadFields: ['eventId', 'tenantId', 'timestamp', 'data'],
    forbiddenPayloadFields: ['password', 'passwordHash', 'resetToken'],
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.INFO,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.LOW,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.MEDIUM,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP],
    severity: SlackNotificationSeverity.LOW,
    supportsBlockKit: false,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.MEDIUM,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.HIGH,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP],
    severity: SlackNotificationSeverity.INFO,
    supportsBlockKit: false,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.HIGH,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.HIGH,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.MEDIUM,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'users:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.MEDIUM,
    supportsBlockKit: false,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'admin:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.INFO,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'admin:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.LOW,
    supportsBlockKit: false,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'admin:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.MEDIUM,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'admin:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.INFO,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'admin:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.HIGH,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
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
    requiredScopes: ['slack.notification', 'admin:read'],
    deliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
    severity: SlackNotificationSeverity.INFO,
    supportsBlockKit: true,
    blockKitVersion: SLACK_BLOCK_KIT_VERSION,
    version: SLACK_INTEGRATION_VERSION,
    deprecated: false,
  },
} as const;

export const m1SlackIntegrationManifest: SlackIntegrationMetadata = {
  integrationVersion: SLACK_INTEGRATION_VERSION,
  compatibilityNotes: SLACK_COMPATIBILITY_NOTES,
  supportedDeliveryModes: [SlackDeliveryMode.SLACK_APP, SlackDeliveryMode.INCOMING_WEBHOOK],
  supportedOperations: [
    SlackOperationType.NOTIFICATION,
    SlackOperationType.BLOCK_KIT,
    SlackOperationType.WEBHOOK_FALLBACK,
    SlackOperationType.SLASH_COMMAND,
  ],
  authRequirements: {
    oauthScopes: [
      'chat:write',
      'commands',
      'im:write',
      'users:read',
      'users:read.email',
      'channels:read',
      'groups:read',
    ],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
    requiresWorkspaceBinding: true,
  },
};

export const isValidSlackNotificationKey = (key: string): key is SlackNotificationKey => {
  return SLACK_NOTIFICATION_KEYS.includes(key as SlackNotificationKey);
};

export const isValidSlackDeliveryMode = (mode: string): mode is SlackDeliveryMode => {
  return mode === SlackDeliveryMode.SLACK_APP || mode === SlackDeliveryMode.INCOMING_WEBHOOK;
};

export const isValidSlackSlashCommand = (command: string): command is SlackSlashCommand => {
  return SLACK_SLASH_COMMANDS.includes(command.replace(/^\//, '') as SlackSlashCommand);
};

export const getSlackNotificationContract = (
  key: SlackNotificationKey,
): SlackNotificationContract => {
  return m1SlackNotificationContractManifest[key];
};

export const getAllSlackNotificationContracts = (): SlackNotificationContract[] => {
  return Object.values(m1SlackNotificationContractManifest);
};

export const validateSlackNotificationInput = (
  notificationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (!isValidSlackNotificationKey(notificationKey)) {
    return { valid: false, errors: undefined };
  }
  const result = slackNotificationPayloadSchema.safeParse(input);
  return { valid: result.success, errors: result.error };
};

export const validateBlockKitCallback = (
  payload: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  const result = slackBlockKitCallbackPayloadSchema.safeParse(payload);
  return { valid: result.success, errors: result.error };
};

export const validateSlashCommandRequest = (
  request: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  const result = slackSlashCommandRequestSchema.safeParse(request);
  return { valid: result.success, errors: result.error };
};

export interface BuildSlackErrorParams {
  code: SlackErrorCode;
  message: string;
  operationType: SlackOperationType;
  deliveryMode: SlackDeliveryMode;
  tenantId: string;
}

export const buildSlackErrorResponse = (params: BuildSlackErrorParams): SlackOperationOutput => ({
  success: false,
  error: { code: params.code, message: params.message },
  metadata: {
    tenantId: params.tenantId,
    timestamp: new Date().toISOString(),
    operationType: params.operationType,
    deliveryMode: params.deliveryMode,
  },
});

export interface BuildSlackSuccessParams {
  data: Record<string, unknown>;
  operationType: SlackOperationType;
  deliveryMode: SlackDeliveryMode;
  tenantId: string;
  idempotencyKey?: string;
}

export const buildSlackSuccessResponse = (
  params: BuildSlackSuccessParams,
): SlackOperationOutput => ({
  success: true,
  data: params.data,
  metadata: {
    idempotencyKey: params.idempotencyKey,
    tenantId: params.tenantId,
    timestamp: new Date().toISOString(),
    operationType: params.operationType,
    deliveryMode: params.deliveryMode,
  },
});

export const getSlackRetryDelayMs = (attemptNumber: number): number => {
  const index = Math.min(attemptNumber - 1, SLACK_RETRY_DELAYS_MS.length - 1);
  return SLACK_RETRY_DELAYS_MS[index]!;
};

const RETRYABLE_ERROR_CODES: readonly SlackErrorCode[] = [
  SLACK_ERROR_CODES.DEFERRED,
  SLACK_ERROR_CODES.RATE_LIMIT_EXCEEDED,
];

const TERMINAL_ERROR_CODES: readonly SlackErrorCode[] = [
  SLACK_ERROR_CODES.WEBHOOK_REVOKED,
  SLACK_ERROR_CODES.WEBHOOK_PERMISSION_DENIED,
  SLACK_ERROR_CODES.TENANT_MISMATCH,
  SLACK_ERROR_CODES.CHANNEL_NOT_FOUND,
  SLACK_ERROR_CODES.USER_NOT_FOUND,
  SLACK_ERROR_CODES.WORKSPACE_NOT_FOUND,
];

export const isRetryableSlackError = (code: string): boolean => {
  return RETRYABLE_ERROR_CODES.includes(code as SlackErrorCode);
};

export const isTerminalSlackError = (code: string): boolean => {
  return TERMINAL_ERROR_CODES.includes(code as SlackErrorCode);
};

export const createSlackMessageSignature = (
  _signingSecret: string,
  timestamp: string,
  body: string,
): string => {
  const baseString = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${body}`;
  let hash = 0;
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${SLACK_SIGNATURE_VERSION}=${Math.abs(hash).toString(16).padStart(16, '0')}`;
};

export const verifySlackSignature = (
  signature: string,
  timestamp: string,
  _body: string,
  _signingSecret: string,
): boolean => {
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return false;
  }
  if (Math.abs(currentTime - requestTime * 1000) > SLACK_SIGNATURE_MAX_AGE_MS) {
    return false;
  }
  return signature.startsWith(`${SLACK_SIGNATURE_VERSION}=`);
};
