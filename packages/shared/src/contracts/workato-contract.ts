import { z } from 'zod';

export const WorkatoOperationType = {
  RECIPE_TRIGGER: 'recipe_trigger',
  RECIPE_ACTION: 'recipe_action',
} as const;

export type WorkatoOperationType = (typeof WorkatoOperationType)[keyof typeof WorkatoOperationType];

export const workatoOperationTypeSchema = z.enum([
  WorkatoOperationType.RECIPE_TRIGGER,
  WorkatoOperationType.RECIPE_ACTION,
]);

export const WORKATO_INTEGRATION_VERSION = '1.0.0';
export const WORKATO_COMPATIBILITY_NOTES =
  'Requires OAuth2 client credentials with workato recipe scopes';

export const workatoIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedOperations: z.array(workatoOperationTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
  }),
});

export type WorkatoIntegrationMetadata = z.infer<typeof workatoIntegrationMetadataSchema>;

export const workatoOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().max(255).optional(),
  recipeId: z.string().optional(),
});

export type WorkatoOperationInput = z.infer<typeof workatoOperationInputSchema>;

export const workatoOperationOutputSchema = z.object({
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
      operationType: workatoOperationTypeSchema,
      operationKey: z.string(),
      recipeId: z.string().optional(),
    })
    .optional(),
});

export type WorkatoOperationOutput = z.infer<typeof workatoOperationOutputSchema>;

export const workatoOperationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  operationType: workatoOperationTypeSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  requiredScopes: z.array(z.string()),
  idempotencySupported: z.boolean(),
  tenantBindingRequired: z.boolean(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type WorkatoOperationContract = z.infer<typeof workatoOperationContractSchema>;

export const WORKATO_TRIGGER_KEYS = [
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

export type WorkatoTriggerKey = (typeof WORKATO_TRIGGER_KEYS)[number];

export const workatoTriggerPayloadSchema = z.object({
  eventType: z.string(),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
  triggerKey: z.string(),
  triggerLabel: z.string(),
  triggerDescription: z.string(),
  recipeId: z.string().uuid(),
  recipeName: z.string(),
});

export type WorkatoTriggerPayload = z.infer<typeof workatoTriggerPayloadSchema>;

export const workatoTriggerContractSchema = workatoOperationContractSchema.extend({
  operationType: z.literal(WorkatoOperationType.RECIPE_TRIGGER),
  webhookEventType: z.string(),
  recipeId: z.string().uuid(),
  samplePayload: workatoTriggerPayloadSchema.optional(),
});

export type WorkatoTriggerContract = z.infer<typeof workatoTriggerContractSchema>;

export const WORKATO_ACTION_KEYS = [
  'create_user',
  'update_user',
  'assign_training',
  'create_report',
  'send_notification',
] as const;

export type WorkatoActionKey = (typeof WORKATO_ACTION_KEYS)[number];

export const workatoActionInputSchemas = {
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

export type WorkatoActionInputSchemas = z.infer<
  (typeof workatoActionInputSchemas)[keyof typeof workatoActionInputSchemas]
>;

export const workatoActionOutputSchemas = {
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

export const workatoActionContractSchema = workatoOperationContractSchema.extend({
  operationType: z.literal(WorkatoOperationType.RECIPE_ACTION),
  idempotencyKeyFormat: z.string().optional(),
  recipeId: z.string().uuid(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type WorkatoActionContract = z.infer<typeof workatoActionContractSchema>;

export const WORKATO_OUTPUT_INVARIANTS = {
  ALWAYS_INCLUDE_ID: true,
  NULLABLE_OPTIONAL_FIELDS: true,
  DETERMINISTIC_FIELD_INCLUSION: true,
  STABLE_FIELD_NAMING: true,
  RECIPE_METADATA_REQUIRED: true,
} as const;

export type WorkatoOutputInvariants = typeof WORKATO_OUTPUT_INVARIANTS;

export const WORKATO_ERROR_CODES = {
  INVALID_INPUT: 'WORKATO_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'WORKATO_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'WORKATO_TENANT_MISMATCH',
  NOT_FOUND: 'WORKATO_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'WORKATO_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'WORKATO_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'WORKATO_AUTH_FAILED',
  RECIPE_NOT_FOUND: 'WORKATO_RECIPE_NOT_FOUND',
  RECIPE_DISABLED: 'WORKATO_RECIPE_DISABLED',
} as const;

export type WorkatoErrorCode = (typeof WORKATO_ERROR_CODES)[keyof typeof WORKATO_ERROR_CODES];

export const m1WorkatoTriggerContractManifest: Record<WorkatoTriggerKey, WorkatoTriggerContract> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Triggered when a new user is created in the system',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.user.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440001',
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
      recipeId: '550e8400-e29b-41d4-a716-446655440001',
      recipeName: 'User Created Handler',
    },
  },
  user_updated: {
    key: 'user_updated',
    label: 'User Updated',
    description: 'Triggered when an existing user is updated',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.user.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440002',
  },
  user_deactivated: {
    key: 'user_deactivated',
    label: 'User Deactivated',
    description: 'Triggered when a user is deactivated',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.user.deactivated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440003',
  },
  session_created: {
    key: 'session_created',
    label: 'Session Created',
    description: 'Triggered when a user session is created',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.session.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440004',
  },
  session_revoked: {
    key: 'session_revoked',
    label: 'Session Revoked',
    description: 'Triggered when a user session is revoked',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.session.revoked',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440005',
  },
  login_failed: {
    key: 'login_failed',
    label: 'Login Failed',
    description: 'Triggered when a login attempt fails',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.login.failed',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440006',
  },
  mfa_enabled: {
    key: 'mfa_enabled',
    label: 'MFA Enabled',
    description: 'Triggered when a user enables multi-factor authentication',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.mfa_enabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440007',
  },
  mfa_disabled: {
    key: 'mfa_disabled',
    label: 'MFA Disabled',
    description: 'Triggered when a user disables multi-factor authentication',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'auth.mfa_disabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440008',
  },
  tenant_created: {
    key: 'tenant_created',
    label: 'Tenant Created',
    description: 'Triggered when a new tenant is created',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'enterprise.tenant.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440009',
  },
  tenant_updated: {
    key: 'tenant_updated',
    label: 'Tenant Updated',
    description: 'Triggered when a tenant is updated',
    operationType: WorkatoOperationType.RECIPE_TRIGGER,
    webhookEventType: 'enterprise.tenant.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['workato.recipe', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440010',
  },
} as const;

export const m1WorkatoActionContractManifest: Record<WorkatoActionKey, WorkatoActionContract> = {
  create_user: {
    key: 'create_user',
    label: 'Create User',
    description: 'Creates a new user in the system',
    operationType: WorkatoOperationType.RECIPE_ACTION,
    inputSchema: workatoActionInputSchemas.create_user.shape,
    outputSchema: workatoActionOutputSchemas.create_user.shape,
    requiredScopes: ['workato.recipe', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{email}',
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440011',
  },
  update_user: {
    key: 'update_user',
    label: 'Update User',
    description: 'Updates an existing user in the system',
    operationType: WorkatoOperationType.RECIPE_ACTION,
    inputSchema: workatoActionInputSchemas.update_user.shape,
    outputSchema: workatoActionOutputSchemas.update_user.shape,
    requiredScopes: ['workato.recipe', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}:{fields}',
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440012',
  },
  assign_training: {
    key: 'assign_training',
    label: 'Assign Training',
    description: 'Assigns a training program to a user',
    operationType: WorkatoOperationType.RECIPE_ACTION,
    inputSchema: workatoActionInputSchemas.assign_training.shape,
    outputSchema: workatoActionOutputSchemas.assign_training.shape,
    requiredScopes: ['workato.recipe', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'assignment:{userId}:{trainingId}',
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440013',
  },
  create_report: {
    key: 'create_report',
    label: 'Create Report',
    description: 'Generates a report based on specified criteria',
    operationType: WorkatoOperationType.RECIPE_ACTION,
    inputSchema: workatoActionInputSchemas.create_report.shape,
    outputSchema: workatoActionOutputSchemas.create_report.shape,
    requiredScopes: ['workato.recipe', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'report:{reportType}:{tenantId}',
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440014',
  },
  send_notification: {
    key: 'send_notification',
    label: 'Send Notification',
    description: 'Sends a notification to a user',
    operationType: WorkatoOperationType.RECIPE_ACTION,
    inputSchema: workatoActionInputSchemas.send_notification.shape,
    outputSchema: workatoActionOutputSchemas.send_notification.shape,
    requiredScopes: ['workato.recipe', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'notification:{userId}:{timestamp}',
    tenantBindingRequired: true,
    version: WORKATO_INTEGRATION_VERSION,
    deprecated: false,
    recipeId: '550e8400-e29b-41d4-a716-446655440015',
  },
} as const;

export const m1WorkatoIntegrationManifest: WorkatoIntegrationMetadata = {
  integrationVersion: WORKATO_INTEGRATION_VERSION,
  compatibilityNotes: WORKATO_COMPATIBILITY_NOTES,
  supportedOperations: [WorkatoOperationType.RECIPE_TRIGGER, WorkatoOperationType.RECIPE_ACTION],
  authRequirements: {
    oauthScopes: ['workato.read', 'workato.write', 'workato.recipe'],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
  },
};

export const isValidWorkatoTriggerKey = (key: string): key is WorkatoTriggerKey => {
  return WORKATO_TRIGGER_KEYS.includes(key as WorkatoTriggerKey);
};

export const isValidWorkatoActionKey = (key: string): key is WorkatoActionKey => {
  return WORKATO_ACTION_KEYS.includes(key as WorkatoActionKey);
};

export const getWorkatoTriggerContract = (key: WorkatoTriggerKey): WorkatoTriggerContract => {
  return m1WorkatoTriggerContractManifest[key];
};

export const getWorkatoActionContract = (key: WorkatoActionKey): WorkatoActionContract => {
  return m1WorkatoActionContractManifest[key];
};

export const getAllWorkatoOperationContracts = (): WorkatoOperationContract[] => {
  return [
    ...Object.values(m1WorkatoTriggerContractManifest),
    ...Object.values(m1WorkatoActionContractManifest),
  ];
};

export const validateWorkatoInput = (
  operationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (isValidWorkatoActionKey(operationKey)) {
    const result = workatoActionInputSchemas[operationKey].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  return { valid: false, errors: undefined };
};

export const buildWorkatoErrorResponse = (
  code: WorkatoErrorCode,
  message: string,
  operationType: WorkatoOperationType,
  operationKey: string,
  tenantId: string,
  recipeId?: string,
): WorkatoOperationOutput => ({
  success: false,
  error: { code, message },
  metadata: {
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    operationKey,
    recipeId,
  },
});

export const buildWorkatoSuccessResponse = (
  data: Record<string, unknown>,
  operationType: WorkatoOperationType,
  operationKey: string,
  tenantId: string,
  idempotencyKey?: string,
  recipeId?: string,
): WorkatoOperationOutput => ({
  success: true,
  data,
  metadata: {
    idempotencyKey,
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    operationKey,
    recipeId,
  },
});
