import { z } from 'zod';

export const PowerAutomateOperationType = {
  TRIGGER: 'trigger',
  ACTION: 'action',
} as const;

export type PowerAutomateOperationType =
  (typeof PowerAutomateOperationType)[keyof typeof PowerAutomateOperationType];

export const powerAutomateOperationTypeSchema = z.enum([
  PowerAutomateOperationType.TRIGGER,
  PowerAutomateOperationType.ACTION,
]);

export const PowerAutomateTriggerType = {
  POLLING: 'polling',
  PUSH: 'push',
} as const;

export type PowerAutomateTriggerType =
  (typeof PowerAutomateTriggerType)[keyof typeof PowerAutomateTriggerType];

export const powerAutomateTriggerTypeSchema = z.enum([
  PowerAutomateTriggerType.POLLING,
  PowerAutomateTriggerType.PUSH,
]);

export const PowerAutomateExecutionMode = {
  CLOUD: 'cloud',
  DESKTOP_FLOW: 'desktop-flow',
  HYBRID: 'hybrid',
} as const;

export type PowerAutomateExecutionMode =
  (typeof PowerAutomateExecutionMode)[keyof typeof PowerAutomateExecutionMode];

export const powerAutomateExecutionModeSchema = z.enum([
  PowerAutomateExecutionMode.CLOUD,
  PowerAutomateExecutionMode.DESKTOP_FLOW,
  PowerAutomateExecutionMode.HYBRID,
]);

export const POWER_AUTOMATE_INTEGRATION_VERSION = '1.0.0';
export const POWER_AUTOMATE_COMPATIBILITY_NOTES =
  'Requires OAuth2 client credentials with powerautomate scopes. Supports custom connector manifest, dynamic schema, M365 field mapping, and desktop flow gateway.';

export const powerAutomateIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedOperations: z.array(powerAutomateOperationTypeSchema),
  supportedTriggerTypes: z.array(powerAutomateTriggerTypeSchema),
  supportedExecutionModes: z.array(powerAutomateExecutionModeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
    requiresM365Connection: z.boolean().default(false),
    requiresOnPremisesGateway: z.boolean().default(false),
  }),
});

export type PowerAutomateIntegrationMetadata = z.infer<
  typeof powerAutomateIntegrationMetadataSchema
>;

export const M365ServiceType = {
  SHAREPOINT: 'sharepoint',
  OUTLOOK: 'outlook',
  TEAMS: 'teams',
  EXCEL: 'excel',
} as const;

export type M365ServiceType = (typeof M365ServiceType)[keyof typeof M365ServiceType];

export const m365ServiceTypeSchema = z.enum([
  M365ServiceType.SHAREPOINT,
  M365ServiceType.OUTLOOK,
  M365ServiceType.TEAMS,
  M365ServiceType.EXCEL,
]);

export const m365FieldMappingSchema = z.object({
  service: m365ServiceTypeSchema,
  sourceField: z.string(),
  targetField: z.string(),
  isDynamic: z.boolean().default(false),
  nullable: z.boolean().default(true),
  description: z.string().optional(),
});

export type M365FieldMapping = z.infer<typeof m365FieldMappingSchema>;

export const m365DynamicContentTokenSchema = z.object({
  name: z.string(),
  service: m365ServiceTypeSchema,
  fieldPath: z.string(),
  nullable: z.boolean().default(true),
  description: z.string().optional(),
});

export type M365DynamicContentToken = z.infer<typeof m365DynamicContentTokenSchema>;

export const powerAutomateOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().max(255).optional(),
  executionMode: powerAutomateExecutionModeSchema.optional(),
  gatewayId: z.string().uuid().optional(),
  m365ConnectionId: z.string().uuid().optional(),
});

export type PowerAutomateOperationInput = z.infer<typeof powerAutomateOperationInputSchema>;

export const powerAutomateOperationOutputSchema = z.object({
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
      operationType: powerAutomateOperationTypeSchema,
      operationKey: z.string(),
      executionMode: powerAutomateExecutionModeSchema.optional(),
      m365FieldMappings: z.array(m365FieldMappingSchema).optional(),
    })
    .optional(),
});

export type PowerAutomateOperationOutput = z.infer<typeof powerAutomateOperationOutputSchema>;

export const powerAutomateOperationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  operationType: powerAutomateOperationTypeSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  requiredScopes: z.array(z.string()),
  idempotencySupported: z.boolean(),
  tenantBindingRequired: z.boolean(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
  m365FieldMappings: z.array(m365FieldMappingSchema).optional(),
  dynamicContentTokens: z.array(m365DynamicContentTokenSchema).optional(),
});

export type PowerAutomateOperationContract = z.infer<typeof powerAutomateOperationContractSchema>;

export const POWER_AUTOMATE_TRIGGER_KEYS = [
  'user_created',
  'user_updated',
  'user_deactivated',
  'session_created',
  'session_revoked',
  'login_failed',
  'mfa_enabled',
  'mfa_disabled',
  'tenant_created',
  'tenant_updated',
] as const;

export type PowerAutomateTriggerKey = (typeof POWER_AUTOMATE_TRIGGER_KEYS)[number];

export const powerAutomateTriggerPayloadSchema = z.object({
  eventType: z.string(),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
  triggerKey: z.string(),
  triggerLabel: z.string(),
  triggerDescription: z.string(),
  executionMode: powerAutomateExecutionModeSchema.optional(),
});

export type PowerAutomateTriggerPayload = z.infer<typeof powerAutomateTriggerPayloadSchema>;

export const powerAutomateTriggerContractSchema = powerAutomateOperationContractSchema.extend({
  operationType: z.literal(PowerAutomateOperationType.TRIGGER),
  triggerType: powerAutomateTriggerTypeSchema,
  webhookEventType: z.string(),
  samplePayload: powerAutomateTriggerPayloadSchema.optional(),
  supportsPolling: z.boolean().default(false),
  pollingIntervalSeconds: z.number().int().positive().optional(),
});

export type PowerAutomateTriggerContract = z.infer<typeof powerAutomateTriggerContractSchema>;

export const POWER_AUTOMATE_ACTION_KEYS = [
  'create_user',
  'update_user',
  'assign_training',
  'create_report',
  'send_notification',
] as const;

export type PowerAutomateActionKey = (typeof POWER_AUTOMATE_ACTION_KEYS)[number];

export const powerAutomateActionInputSchemas = {
  create_user: z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    department: z.string().uuid().optional(),
    role: z.enum(['user', 'admin', 'manager']).default('user'),
  }),
  update_user: z.object({
    userId: z.string().uuid(),
    email: z.string().email().optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    department: z.string().uuid().optional(),
    role: z.enum(['user', 'admin', 'manager']).optional(),
    status: z.enum(['active', 'inactive', 'deactivated']).optional(),
  }),
  assign_training: z.object({
    userId: z.string().uuid(),
    trainingId: z.string().uuid(),
    deadline: z.string().datetime().optional(),
    assignedBy: z.string().uuid().optional(),
  }),
  create_report: z.object({
    reportType: z.enum(['user_activity', 'training_completion', 'audit', 'compliance']),
    dateRange: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .optional(),
    filters: z.record(z.unknown()).optional(),
    format: z.enum(['json', 'csv', 'pdf']).default('json'),
  }),
  send_notification: z.object({
    userId: z.string().uuid(),
    template: z.string().min(1).max(100),
    data: z.record(z.unknown()),
    channel: z.enum(['email', 'in_app', 'sms']).default('email'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  }),
} as const;

export type PowerAutomateActionInputSchemas = z.infer<
  (typeof powerAutomateActionInputSchemas)[keyof typeof powerAutomateActionInputSchemas]
>;

export const powerAutomateActionOutputSchemas = {
  create_user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    department: z.string().uuid().nullable(),
    role: z.string(),
    status: z.string(),
    createdAt: z.string().datetime(),
  }),
  update_user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    department: z.string().uuid().nullable(),
    role: z.string(),
    status: z.string(),
    updatedAt: z.string().datetime(),
  }),
  assign_training: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    trainingId: z.string().uuid(),
    deadline: z.string().datetime().nullable(),
    assignedAt: z.string().datetime(),
    status: z.enum(['pending', 'in_progress', 'completed', 'expired']),
  }),
  create_report: z.object({
    id: z.string().uuid(),
    reportType: z.string(),
    status: z.enum(['generating', 'ready', 'failed']),
    downloadUrl: z.string().url().nullable(),
    expiresAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  }),
  send_notification: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    template: z.string(),
    channel: z.string(),
    status: z.enum(['queued', 'sent', 'delivered', 'failed']),
    sentAt: z.string().datetime().nullable(),
  }),
} as const;

export const powerAutomateActionContractSchema = powerAutomateOperationContractSchema.extend({
  operationType: z.literal(PowerAutomateOperationType.ACTION),
  idempotencyKeyFormat: z.string().optional(),
  supportsDesktopFlow: z.boolean().default(false),
  requiresOnPremisesGateway: z.boolean().default(false),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type PowerAutomateActionContract = z.infer<typeof powerAutomateActionContractSchema>;

export const POWER_AUTOMATE_OUTPUT_INVARIANTS = {
  ALWAYS_INCLUDE_ID: true,
  NULLABLE_OPTIONAL_FIELDS: true,
  DETERMINISTIC_FIELD_INCLUSION: true,
  STABLE_FIELD_NAMING: true,
  DYNAMIC_CONTENT_TOKEN_SUPPORT: true,
  M365_FIELD_MAPPING_SUPPORT: true,
} as const;

export type PowerAutomateOutputInvariants = typeof POWER_AUTOMATE_OUTPUT_INVARIANTS;

export const POWER_AUTOMATE_ERROR_CODES = {
  INVALID_INPUT: 'PA_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'PA_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'PA_TENANT_MISMATCH',
  NOT_FOUND: 'PA_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'PA_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'PA_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'PA_AUTH_FAILED',
  M365_CONNECTION_FAILED: 'PA_M365_CONNECTION_FAILED',
  GATEWAY_UNREACHABLE: 'PA_GATEWAY_UNREACHABLE',
  DESKTOP_FLOW_FAILED: 'PA_DESKTOP_FLOW_FAILED',
  DEFERRED: 'PA_DEFERRED',
} as const;

export type PowerAutomateErrorCode =
  (typeof POWER_AUTOMATE_ERROR_CODES)[keyof typeof POWER_AUTOMATE_ERROR_CODES];

export const POWER_AUTOMATE_RATE_LIMITS = {
  ACTIONS_PER_MINUTE: 100,
  ACTIONS_PER_HOUR: 1000,
  TRIGGERS_PER_MINUTE: 60,
  TRIGGERS_PER_HOUR: 500,
} as const;

export const POWER_AUTOMATE_RETRY_DELAYS_MS = [60000, 300000, 1800000, 7200000];
export const POWER_AUTOMATE_DEFAULT_MAX_ATTEMPTS = 4;

export const POWER_AUTOMATE_GATEWAY_CONFIG_SCHEMA = z.object({
  gatewayId: z.string().uuid(),
  gatewayName: z.string(),
  gatewayUrl: z.string().url(),
  isOnline: z.boolean(),
  lastHeartbeatAt: z.string().datetime(),
});

export type PowerAutomateGatewayConfig = z.infer<typeof POWER_AUTOMATE_GATEWAY_CONFIG_SCHEMA>;

export const POWER_AUTOMATE_M365_CONNECTIONS_SCHEMA = z.object({
  connectionId: z.string().uuid(),
  service: m365ServiceTypeSchema,
  tenantId: z.string().uuid(),
  connectionStatus: z.enum(['connected', 'disconnected', 'error']),
  expiresAt: z.string().datetime().optional(),
});

export type PowerAutomateM365Connection = z.infer<typeof POWER_AUTOMATE_M365_CONNECTIONS_SCHEMA>;

export const m1PowerAutomateTriggerContractManifest: Record<
  PowerAutomateTriggerKey,
  PowerAutomateTriggerContract
> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Triggered when a new user is created in the system',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.user.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
    samplePayload: {
      eventType: 'auth.user.created',
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      occurredAt: '2024-01-15T10:30:00Z',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      version: 1,
      data: {
        id: '770e8400-e29b-41d4-a716-446655440002',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        role: 'user',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
      },
      triggerKey: 'user_created',
      triggerLabel: 'User Created',
      triggerDescription: 'Triggered when a new user is created in the system',
    },
    m365FieldMappings: [
      {
        service: M365ServiceType.OUTLOOK,
        sourceField: 'email',
        targetField: 'mail',
        isDynamic: false,
        nullable: false,
      },
      {
        service: M365ServiceType.SHAREPOINT,
        sourceField: 'firstName',
        targetField: 'FirstName',
        isDynamic: true,
        nullable: true,
      },
    ],
    dynamicContentTokens: [
      {
        name: 'User Email',
        service: M365ServiceType.OUTLOOK,
        fieldPath: 'data.email',
        nullable: false,
      },
      {
        name: 'User ID',
        service: M365ServiceType.SHAREPOINT,
        fieldPath: 'data.id',
        nullable: false,
      },
    ],
  },
  user_updated: {
    key: 'user_updated',
    label: 'User Updated',
    description: 'Triggered when an existing user is updated',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.user.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  user_deactivated: {
    key: 'user_deactivated',
    label: 'User Deactivated',
    description: 'Triggered when a user is deactivated',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.user.deactivated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  session_created: {
    key: 'session_created',
    label: 'Session Created',
    description: 'Triggered when a user session is created',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.session.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  session_revoked: {
    key: 'session_revoked',
    label: 'Session Revoked',
    description: 'Triggered when a user session is revoked',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.session.revoked',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  login_failed: {
    key: 'login_failed',
    label: 'Login Failed',
    description: 'Triggered when a login attempt fails',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.login.failed',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  mfa_enabled: {
    key: 'mfa_enabled',
    label: 'MFA Enabled',
    description: 'Triggered when a user enables multi-factor authentication',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.mfa_enabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  mfa_disabled: {
    key: 'mfa_disabled',
    label: 'MFA Disabled',
    description: 'Triggered when a user disables multi-factor authentication',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'auth.mfa_disabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  tenant_created: {
    key: 'tenant_created',
    label: 'Tenant Created',
    description: 'Triggered when a new tenant is created',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'enterprise.tenant.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
  tenant_updated: {
    key: 'tenant_updated',
    label: 'Tenant Updated',
    description: 'Triggered when a tenant is updated',
    operationType: PowerAutomateOperationType.TRIGGER,
    triggerType: PowerAutomateTriggerType.PUSH,
    webhookEventType: 'enterprise.tenant.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['powerautomate.trigger', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsPolling: false,
  },
} as const;

export const m1PowerAutomateActionContractManifest: Record<
  PowerAutomateActionKey,
  PowerAutomateActionContract
> = {
  create_user: {
    key: 'create_user',
    label: 'Create User',
    description: 'Creates a new user in the system',
    operationType: PowerAutomateOperationType.ACTION,
    inputSchema: powerAutomateActionInputSchemas.create_user.shape,
    outputSchema: powerAutomateActionOutputSchemas.create_user.shape,
    requiredScopes: ['powerautomate.action', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{email}',
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsDesktopFlow: false,
    requiresOnPremisesGateway: false,
    m365FieldMappings: [
      {
        service: M365ServiceType.OUTLOOK,
        sourceField: 'email',
        targetField: 'mail',
        isDynamic: false,
        nullable: false,
      },
      {
        service: M365ServiceType.EXCEL,
        sourceField: 'email',
        targetField: 'Email',
        isDynamic: true,
        nullable: false,
      },
    ],
  },
  update_user: {
    key: 'update_user',
    label: 'Update User',
    description: 'Updates an existing user in the system',
    operationType: PowerAutomateOperationType.ACTION,
    inputSchema: powerAutomateActionInputSchemas.update_user.shape,
    outputSchema: powerAutomateActionOutputSchemas.update_user.shape,
    requiredScopes: ['powerautomate.action', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}:{fields}',
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsDesktopFlow: true,
    requiresOnPremisesGateway: false,
    m365FieldMappings: [
      {
        service: M365ServiceType.SHAREPOINT,
        sourceField: 'userId',
        targetField: 'UserId',
        isDynamic: true,
        nullable: false,
      },
    ],
  },
  assign_training: {
    key: 'assign_training',
    label: 'Assign Training',
    description: 'Assigns a training program to a user',
    operationType: PowerAutomateOperationType.ACTION,
    inputSchema: powerAutomateActionInputSchemas.assign_training.shape,
    outputSchema: powerAutomateActionOutputSchemas.assign_training.shape,
    requiredScopes: ['powerautomate.action', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'assignment:{userId}:{trainingId}',
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsDesktopFlow: true,
    requiresOnPremisesGateway: false,
    m365FieldMappings: [
      {
        service: M365ServiceType.TEAMS,
        sourceField: 'userId',
        targetField: 'userId',
        isDynamic: true,
        nullable: false,
      },
    ],
  },
  create_report: {
    key: 'create_report',
    label: 'Create Report',
    description: 'Generates a report based on specified criteria',
    operationType: PowerAutomateOperationType.ACTION,
    inputSchema: powerAutomateActionInputSchemas.create_report.shape,
    outputSchema: powerAutomateActionOutputSchemas.create_report.shape,
    requiredScopes: ['powerautomate.action', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'report:{reportType}:{tenantId}',
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsDesktopFlow: true,
    requiresOnPremisesGateway: false,
    m365FieldMappings: [
      {
        service: M365ServiceType.EXCEL,
        sourceField: 'reportType',
        targetField: 'ReportType',
        isDynamic: true,
        nullable: true,
      },
      {
        service: M365ServiceType.SHAREPOINT,
        sourceField: 'downloadUrl',
        targetField: 'File/Url',
        isDynamic: true,
        nullable: true,
      },
    ],
  },
  send_notification: {
    key: 'send_notification',
    label: 'Send Notification',
    description: 'Sends a notification to a user',
    operationType: PowerAutomateOperationType.ACTION,
    inputSchema: powerAutomateActionInputSchemas.send_notification.shape,
    outputSchema: powerAutomateActionOutputSchemas.send_notification.shape,
    requiredScopes: ['powerautomate.action', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'notification:{userId}:{timestamp}',
    tenantBindingRequired: true,
    version: POWER_AUTOMATE_INTEGRATION_VERSION,
    deprecated: false,
    supportsDesktopFlow: false,
    requiresOnPremisesGateway: false,
    m365FieldMappings: [
      {
        service: M365ServiceType.OUTLOOK,
        sourceField: 'userId',
        targetField: 'userId',
        isDynamic: true,
        nullable: false,
      },
      {
        service: M365ServiceType.TEAMS,
        sourceField: 'userId',
        targetField: 'recipient',
        isDynamic: true,
        nullable: false,
      },
    ],
  },
} as const;

export const m1PowerAutomateIntegrationManifest: PowerAutomateIntegrationMetadata = {
  integrationVersion: POWER_AUTOMATE_INTEGRATION_VERSION,
  compatibilityNotes: POWER_AUTOMATE_COMPATIBILITY_NOTES,
  supportedOperations: [PowerAutomateOperationType.TRIGGER, PowerAutomateOperationType.ACTION],
  supportedTriggerTypes: [PowerAutomateTriggerType.POLLING, PowerAutomateTriggerType.PUSH],
  supportedExecutionModes: [
    PowerAutomateExecutionMode.CLOUD,
    PowerAutomateExecutionMode.DESKTOP_FLOW,
    PowerAutomateExecutionMode.HYBRID,
  ],
  authRequirements: {
    oauthScopes: [
      'powerautomate.read',
      'powerautomate.write',
      'powerautomate.trigger',
      'powerautomate.action',
    ],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
    requiresM365Connection: false,
    requiresOnPremisesGateway: false,
  },
};

export const isValidPowerAutomateTriggerKey = (key: string): key is PowerAutomateTriggerKey => {
  return POWER_AUTOMATE_TRIGGER_KEYS.includes(key as PowerAutomateTriggerKey);
};

export const isValidPowerAutomateActionKey = (key: string): key is PowerAutomateActionKey => {
  return POWER_AUTOMATE_ACTION_KEYS.includes(key as PowerAutomateActionKey);
};

export const getPowerAutomateTriggerContract = (
  key: PowerAutomateTriggerKey,
): PowerAutomateTriggerContract => {
  return m1PowerAutomateTriggerContractManifest[key];
};

export const getPowerAutomateActionContract = (
  key: PowerAutomateActionKey,
): PowerAutomateActionContract => {
  return m1PowerAutomateActionContractManifest[key];
};

export const getAllPowerAutomateOperationContracts = (): PowerAutomateOperationContract[] => {
  return [
    ...Object.values(m1PowerAutomateTriggerContractManifest),
    ...Object.values(m1PowerAutomateActionContractManifest),
  ];
};

export const validatePowerAutomateInput = (
  operationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (isValidPowerAutomateActionKey(operationKey)) {
    const result = powerAutomateActionInputSchemas[operationKey].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  return { valid: false, errors: undefined };
};

export interface BuildPowerAutomateErrorResponseOptions {
  code: PowerAutomateErrorCode;
  message: string;
  operationType: PowerAutomateOperationType;
  operationKey: string;
  tenantId: string;
  executionMode?: PowerAutomateExecutionMode;
}

export const buildPowerAutomateErrorResponse = (
  options: BuildPowerAutomateErrorResponseOptions,
): PowerAutomateOperationOutput => ({
  success: false,
  error: { code: options.code, message: options.message },
  metadata: {
    tenantId: options.tenantId,
    timestamp: new Date().toISOString(),
    operationType: options.operationType,
    operationKey: options.operationKey,
    executionMode: options.executionMode,
  },
});

export interface BuildPowerAutomateSuccessResponseOptions {
  data: Record<string, unknown>;
  operationType: PowerAutomateOperationType;
  operationKey: string;
  tenantId: string;
  idempotencyKey?: string;
  executionMode?: PowerAutomateExecutionMode;
  m365FieldMappings?: M365FieldMapping[];
}

export const buildPowerAutomateSuccessResponse = (
  options: BuildPowerAutomateSuccessResponseOptions,
): PowerAutomateOperationOutput => ({
  success: true,
  data: options.data,
  metadata: {
    idempotencyKey: options.idempotencyKey,
    tenantId: options.tenantId,
    timestamp: new Date().toISOString(),
    operationType: options.operationType,
    operationKey: options.operationKey,
    executionMode: options.executionMode,
    m365FieldMappings: options.m365FieldMappings,
  },
});

export const getPowerAutomateRetryDelayMs = (attemptNumber: number): number => {
  const index = Math.min(attemptNumber - 1, POWER_AUTOMATE_RETRY_DELAYS_MS.length - 1);
  return POWER_AUTOMATE_RETRY_DELAYS_MS[index]!;
};

const RETRYABLE_ERROR_CODES: readonly PowerAutomateErrorCode[] = [
  POWER_AUTOMATE_ERROR_CODES.DEFERRED,
  POWER_AUTOMATE_ERROR_CODES.RATE_LIMIT_EXCEEDED,
  POWER_AUTOMATE_ERROR_CODES.GATEWAY_UNREACHABLE,
];

const TERMINAL_ERROR_CODES: readonly PowerAutomateErrorCode[] = [
  POWER_AUTOMATE_ERROR_CODES.M365_CONNECTION_FAILED,
  POWER_AUTOMATE_ERROR_CODES.DESKTOP_FLOW_FAILED,
  POWER_AUTOMATE_ERROR_CODES.TENANT_MISMATCH,
  POWER_AUTOMATE_ERROR_CODES.NOT_FOUND,
];

export const isPowerAutomateRetryableError = (code: string): boolean => {
  return RETRYABLE_ERROR_CODES.includes(code as PowerAutomateErrorCode);
};

export const isPowerAutomateTerminalError = (code: string): boolean => {
  return TERMINAL_ERROR_CODES.includes(code as PowerAutomateErrorCode);
};
