import { z } from 'zod';

export const TrayIOperationType = {
  CONNECTOR_TRIGGER: 'connector_trigger',
  CONNECTOR_ACTION: 'connector_action',
} as const;

export type TrayIOperationType = (typeof TrayIOperationType)[keyof typeof TrayIOperationType];

export const trayIOperationTypeSchema = z.enum([
  TrayIOperationType.CONNECTOR_TRIGGER,
  TrayIOperationType.CONNECTOR_ACTION,
]);

export const TRAY_IO_INTEGRATION_VERSION = '1.0.0';
export const TRAY_IO_COMPATIBILITY_NOTES =
  'Requires OAuth2 client credentials with tray.io connector scopes';

export const trayIOIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedOperations: z.array(trayIOperationTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
  }),
});

export type TrayIOIntegrationMetadata = z.infer<typeof trayIOIntegrationMetadataSchema>;

export const trayIOOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().max(255).optional(),
  connectorId: z.string().optional(),
  operationId: z.string().optional(),
});

export type TrayIOOperationInput = z.infer<typeof trayIOOperationInputSchema>;

export const trayIOOperationOutputSchema = z.object({
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
      operationType: trayIOperationTypeSchema,
      operationKey: z.string(),
      connectorId: z.string().optional(),
    })
    .optional(),
});

export type TrayIOOperationOutput = z.infer<typeof trayIOOperationOutputSchema>;

export const trayIOOperationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  operationType: trayIOperationTypeSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  requiredScopes: z.array(z.string()),
  idempotencySupported: z.boolean(),
  tenantBindingRequired: z.boolean(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type TrayIOOperationContract = z.infer<typeof trayIOOperationContractSchema>;

export const TRAY_IO_TRIGGER_KEYS = [
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

export type TrayIOTriggerKey = (typeof TRAY_IO_TRIGGER_KEYS)[number];

export const trayIOTriggerPayloadSchema = z.object({
  eventType: z.string(),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
  triggerKey: z.string(),
  triggerLabel: z.string(),
  triggerDescription: z.string(),
  connectorId: z.string().uuid(),
  connectorName: z.string(),
  operationId: z.string().uuid(),
});

export type TrayIOTriggerPayload = z.infer<typeof trayIOTriggerPayloadSchema>;

export const trayIOTriggerContractSchema = trayIOOperationContractSchema.extend({
  operationType: z.literal(TrayIOperationType.CONNECTOR_TRIGGER),
  webhookEventType: z.string(),
  connectorId: z.string().uuid(),
  operationId: z.string().uuid(),
  samplePayload: trayIOTriggerPayloadSchema.optional(),
});

export type TrayIOTriggerContract = z.infer<typeof trayIOTriggerContractSchema>;

export const TRAY_IO_ACTION_KEYS = [
  'create_user',
  'update_user',
  'assign_training',
  'create_report',
  'send_notification',
] as const;

export type TrayIOActionKey = (typeof TRAY_IO_ACTION_KEYS)[number];

export const trayIOActionInputSchemas = {
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

export type TrayIOActionInputSchemas = z.infer<
  (typeof trayIOActionInputSchemas)[keyof typeof trayIOActionInputSchemas]
>;

export const trayIOActionOutputSchemas = {
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

export const trayIOActionContractSchema = trayIOOperationContractSchema.extend({
  operationType: z.literal(TrayIOperationType.CONNECTOR_ACTION),
  idempotencyKeyFormat: z.string().optional(),
  connectorId: z.string().uuid(),
  operationId: z.string().uuid(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type TrayIOActionContract = z.infer<typeof trayIOActionContractSchema>;

export const TRAY_IO_OUTPUT_INVARIANTS = {
  ALWAYS_INCLUDE_ID: true,
  NULLABLE_OPTIONAL_FIELDS: true,
  DETERMINISTIC_FIELD_INCLUSION: true,
  STABLE_FIELD_NAMING: true,
  CONNECTOR_METADATA_REQUIRED: true,
} as const;

export type TrayIOOutputInvariants = typeof TRAY_IO_OUTPUT_INVARIANTS;

export const TRAY_IO_ERROR_CODES = {
  INVALID_INPUT: 'TRAY_IO_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'TRAY_IO_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'TRAY_IO_TENANT_MISMATCH',
  NOT_FOUND: 'TRAY_IO_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'TRAY_IO_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'TRAY_IO_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'TRAY_IO_AUTH_FAILED',
  CONNECTOR_NOT_FOUND: 'TRAY_IO_CONNECTOR_NOT_FOUND',
  CONNECTOR_DISABLED: 'TRAY_IO_CONNECTOR_DISABLED',
  OPERATION_NOT_FOUND: 'TRAY_IO_OPERATION_NOT_FOUND',
} as const;

export type TrayIOErrorCode = (typeof TRAY_IO_ERROR_CODES)[keyof typeof TRAY_IO_ERROR_CODES];

export const m1TrayIOTriggerContractManifest: Record<TrayIOTriggerKey, TrayIOTriggerContract> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Triggered when a new user is created in the system',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.user.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440101',
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
      connectorId: '550e8400-e29b-41d4-a716-446655440001',
      connectorName: 'User Connector',
      operationId: '550e8400-e29b-41d4-a716-446655440101',
    },
  },
  user_updated: {
    key: 'user_updated',
    label: 'User Updated',
    description: 'Triggered when an existing user is updated',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.user.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440102',
  },
  user_deactivated: {
    key: 'user_deactivated',
    label: 'User Deactivated',
    description: 'Triggered when a user is deactivated',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.user.deactivated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440103',
  },
  session_created: {
    key: 'session_created',
    label: 'Session Created',
    description: 'Triggered when a user session is created',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.session.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440104',
  },
  session_revoked: {
    key: 'session_revoked',
    label: 'Session Revoked',
    description: 'Triggered when a user session is revoked',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.session.revoked',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440105',
  },
  login_failed: {
    key: 'login_failed',
    label: 'Login Failed',
    description: 'Triggered when a login attempt fails',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.login.failed',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440106',
  },
  mfa_enabled: {
    key: 'mfa_enabled',
    label: 'MFA Enabled',
    description: 'Triggered when a user enables multi-factor authentication',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.mfa_enabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440107',
  },
  mfa_disabled: {
    key: 'mfa_disabled',
    label: 'MFA Disabled',
    description: 'Triggered when a user disables multi-factor authentication',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'auth.mfa_disabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440108',
  },
  tenant_created: {
    key: 'tenant_created',
    label: 'Tenant Created',
    description: 'Triggered when a new tenant is created',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'enterprise.tenant.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440109',
  },
  tenant_updated: {
    key: 'tenant_updated',
    label: 'Tenant Updated',
    description: 'Triggered when a tenant is updated',
    operationType: TrayIOperationType.CONNECTOR_TRIGGER,
    webhookEventType: 'enterprise.tenant.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['tray_io.connector', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440001',
    operationId: '550e8400-e29b-41d4-a716-446655440110',
  },
} as const;

export const m1TrayIOActionContractManifest: Record<TrayIOActionKey, TrayIOActionContract> = {
  create_user: {
    key: 'create_user',
    label: 'Create User',
    description: 'Creates a new user in the system',
    operationType: TrayIOperationType.CONNECTOR_ACTION,
    inputSchema: trayIOActionInputSchemas.create_user.shape,
    outputSchema: trayIOActionOutputSchemas.create_user.shape,
    requiredScopes: ['tray_io.connector', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{email}',
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440002',
    operationId: '550e8400-e29b-41d4-a716-446655440201',
  },
  update_user: {
    key: 'update_user',
    label: 'Update User',
    description: 'Updates an existing user in the system',
    operationType: TrayIOperationType.CONNECTOR_ACTION,
    inputSchema: trayIOActionInputSchemas.update_user.shape,
    outputSchema: trayIOActionOutputSchemas.update_user.shape,
    requiredScopes: ['tray_io.connector', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}:{fields}',
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440002',
    operationId: '550e8400-e29b-41d4-a716-446655440202',
  },
  assign_training: {
    key: 'assign_training',
    label: 'Assign Training',
    description: 'Assigns a training program to a user',
    operationType: TrayIOperationType.CONNECTOR_ACTION,
    inputSchema: trayIOActionInputSchemas.assign_training.shape,
    outputSchema: trayIOActionOutputSchemas.assign_training.shape,
    requiredScopes: ['tray_io.connector', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'assignment:{userId}:{trainingId}',
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440002',
    operationId: '550e8400-e29b-41d4-a716-446655440203',
  },
  create_report: {
    key: 'create_report',
    label: 'Create Report',
    description: 'Generates a report based on specified criteria',
    operationType: TrayIOperationType.CONNECTOR_ACTION,
    inputSchema: trayIOActionInputSchemas.create_report.shape,
    outputSchema: trayIOActionOutputSchemas.create_report.shape,
    requiredScopes: ['tray_io.connector', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'report:{reportType}:{tenantId}',
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440002',
    operationId: '550e8400-e29b-41d4-a716-446655440204',
  },
  send_notification: {
    key: 'send_notification',
    label: 'Send Notification',
    description: 'Sends a notification to a user',
    operationType: TrayIOperationType.CONNECTOR_ACTION,
    inputSchema: trayIOActionInputSchemas.send_notification.shape,
    outputSchema: trayIOActionOutputSchemas.send_notification.shape,
    requiredScopes: ['tray_io.connector', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'notification:{userId}:{timestamp}',
    tenantBindingRequired: true,
    version: TRAY_IO_INTEGRATION_VERSION,
    deprecated: false,
    connectorId: '550e8400-e29b-41d4-a716-446655440002',
    operationId: '550e8400-e29b-41d4-a716-446655440205',
  },
} as const;

export const m1TrayIOIntegrationManifest: TrayIOIntegrationMetadata = {
  integrationVersion: TRAY_IO_INTEGRATION_VERSION,
  compatibilityNotes: TRAY_IO_COMPATIBILITY_NOTES,
  supportedOperations: [TrayIOperationType.CONNECTOR_TRIGGER, TrayIOperationType.CONNECTOR_ACTION],
  authRequirements: {
    oauthScopes: ['tray_io.read', 'tray_io.write', 'tray_io.connector'],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
  },
};

export const isValidTrayIOTriggerKey = (key: string): key is TrayIOTriggerKey => {
  return TRAY_IO_TRIGGER_KEYS.includes(key as TrayIOTriggerKey);
};

export const isValidTrayIOActionKey = (key: string): key is TrayIOActionKey => {
  return TRAY_IO_ACTION_KEYS.includes(key as TrayIOActionKey);
};

export const getTrayIOTriggerContract = (key: TrayIOTriggerKey): TrayIOTriggerContract => {
  return m1TrayIOTriggerContractManifest[key];
};

export const getTrayIOActionContract = (key: TrayIOActionKey): TrayIOActionContract => {
  return m1TrayIOActionContractManifest[key];
};

export const getAllTrayIOOperationContracts = (): TrayIOOperationContract[] => {
  return [
    ...Object.values(m1TrayIOTriggerContractManifest),
    ...Object.values(m1TrayIOActionContractManifest),
  ];
};

export const validateTrayIOInput = (
  operationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (isValidTrayIOActionKey(operationKey)) {
    const result = trayIOActionInputSchemas[operationKey].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  return { valid: false, errors: undefined };
};

export interface TrayIOErrorResponseOptions {
  code: TrayIOErrorCode;
  message: string;
  operationType: TrayIOperationType;
  operationKey: string;
  tenantId: string;
  connectorId?: string;
}

export const buildTrayIOErrorResponse = (
  options: TrayIOErrorResponseOptions,
): TrayIOOperationOutput => ({
  success: false,
  error: { code: options.code, message: options.message },
  metadata: {
    tenantId: options.tenantId,
    timestamp: new Date().toISOString(),
    operationType: options.operationType,
    operationKey: options.operationKey,
    connectorId: options.connectorId,
  },
});

export interface TrayIOSuccessResponseOptions {
  data: Record<string, unknown>;
  operationType: TrayIOperationType;
  operationKey: string;
  tenantId: string;
  idempotencyKey?: string;
  connectorId?: string;
}

export const buildTrayIOSuccessResponse = (
  options: TrayIOSuccessResponseOptions,
): TrayIOOperationOutput => ({
  success: true,
  data: options.data,
  metadata: {
    idempotencyKey: options.idempotencyKey,
    tenantId: options.tenantId,
    timestamp: new Date().toISOString(),
    operationType: options.operationType,
    operationKey: options.operationKey,
    connectorId: options.connectorId,
  },
});
