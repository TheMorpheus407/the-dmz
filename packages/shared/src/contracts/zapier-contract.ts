import { z } from 'zod';

export const ZapierOperationType = {
  TRIGGER: 'trigger',
  ACTION: 'action',
  SEARCH: 'search',
} as const;

export type ZapierOperationType = (typeof ZapierOperationType)[keyof typeof ZapierOperationType];

export const zapierOperationTypeSchema = z.enum([
  ZapierOperationType.TRIGGER,
  ZapierOperationType.ACTION,
  ZapierOperationType.SEARCH,
]);

export const ZAPIER_INTEGRATION_VERSION = '1.0.0';
export const ZAPIER_COMPATIBILITY_NOTES = 'Requires OAuth2 client credentials with zapier scopes';

export const zapierIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedOperations: z.array(zapierOperationTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
  }),
});

export type ZapierIntegrationMetadata = z.infer<typeof zapierIntegrationMetadataSchema>;

export const zapierOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().max(255).optional(),
});

export type ZapierOperationInput = z.infer<typeof zapierOperationInputSchema>;

export const zapierOperationOutputSchema = z.object({
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
      operationType: zapierOperationTypeSchema,
      operationKey: z.string(),
    })
    .optional(),
});

export type ZapierOperationOutput = z.infer<typeof zapierOperationOutputSchema>;

export const zapierOperationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  operationType: zapierOperationTypeSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  requiredScopes: z.array(z.string()),
  idempotencySupported: z.boolean(),
  tenantBindingRequired: z.boolean(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type ZapierOperationContract = z.infer<typeof zapierOperationContractSchema>;

export const ZAPIER_TRIGGER_KEYS = [
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

export type ZapierTriggerKey = (typeof ZAPIER_TRIGGER_KEYS)[number];

export const zapierTriggerPayloadSchema = z.object({
  eventType: z.string(),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
  triggerKey: z.string(),
  triggerLabel: z.string(),
  triggerDescription: z.string(),
});

export type ZapierTriggerPayload = z.infer<typeof zapierTriggerPayloadSchema>;

export const zapierTriggerContractSchema = zapierOperationContractSchema.extend({
  operationType: z.literal(ZapierOperationType.TRIGGER),
  webhookEventType: z.string(),
  samplePayload: zapierTriggerPayloadSchema.optional(),
});

export type ZapierTriggerContract = z.infer<typeof zapierTriggerContractSchema>;

export const ZAPIER_ACTION_KEYS = [
  'create_user',
  'update_user',
  'assign_training',
  'create_report',
  'send_notification',
] as const;

export type ZapierActionKey = (typeof ZAPIER_ACTION_KEYS)[number];

export const zapierActionInputSchemas = {
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

export type ZapierActionInputSchemas = z.infer<
  (typeof zapierActionInputSchemas)[keyof typeof zapierActionInputSchemas]
>;

export const zapierActionOutputSchemas = {
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

export const zapierActionContractSchema = zapierOperationContractSchema.extend({
  operationType: z.literal(ZapierOperationType.ACTION),
  idempotencyKeyFormat: z.string().optional(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type ZapierActionContract = z.infer<typeof zapierActionContractSchema>;

export const ZAPIER_SEARCH_KEYS = [
  'find_user_by_email',
  'find_training_by_name',
  'find_department_by_code',
] as const;

export type ZapierSearchKey = (typeof ZAPIER_SEARCH_KEYS)[number];

export const zapierSearchInputSchemas = {
  find_user_by_email: z.object({
    email: z.string().email(),
    exactMatch: z.boolean().default(true),
  }),
  find_training_by_name: z.object({
    name: z.string().min(1).max(255),
    exactMatch: z.boolean().default(false),
  }),
  find_department_by_code: z.object({
    code: z.string().min(1).max(50),
    exactMatch: z.boolean().default(true),
  }),
} as const;

export type ZapierSearchInputSchemas = z.infer<
  (typeof zapierSearchInputSchemas)[keyof typeof zapierSearchInputSchemas]
>;

export const zapierSearchOutputSchemas = {
  find_user_by_email: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    department: z.string().uuid().nullable(),
    role: z.string(),
    status: z.string(),
  }),
  find_training_by_name: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().nullable(),
      category: z.string().nullable(),
      status: z.enum(['active', 'deprecated', 'archived']),
    }),
  ),
  find_department_by_code: z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }),
} as const;

export const zapierSearchContractSchema = zapierOperationContractSchema.extend({
  operationType: z.literal(ZapierOperationType.SEARCH),
  matchingSemantics: z.enum(['exact', 'contains', 'case_insensitive']),
  paginationSupported: z.boolean().default(false),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type ZapierSearchContract = z.infer<typeof zapierSearchContractSchema>;

export const ZAPIER_OUTPUT_INVARIANTS = {
  ALWAYS_INCLUDE_ID: true,
  NULLABLE_OPTIONAL_FIELDS: true,
  DETERMINISTIC_FIELD_INCLUSION: true,
  STABLE_FIELD_NAMING: true,
} as const;

export type ZapierOutputInvariants = typeof ZAPIER_OUTPUT_INVARIANTS;

export const ZAPIER_ERROR_CODES = {
  INVALID_INPUT: 'ZAPIER_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'ZAPIER_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'ZAPIER_TENANT_MISMATCH',
  NOT_FOUND: 'ZAPIER_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'ZAPIER_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'ZAPIER_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'ZAPIER_AUTH_FAILED',
  DEFERRED: 'ZAPIER_DEFERRED',
} as const;

export type ZapierErrorCode = (typeof ZAPIER_ERROR_CODES)[keyof typeof ZAPIER_ERROR_CODES];

export const m1ZapierTriggerContractManifest: Record<ZapierTriggerKey, ZapierTriggerContract> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Triggered when a new user is created in the system',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.user.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
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
  },
  user_updated: {
    key: 'user_updated',
    label: 'User Updated',
    description: 'Triggered when an existing user is updated',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.user.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
    samplePayload: {
      eventType: 'auth.user.updated',
      eventId: '550e8400-e29b-41d4-a716-446655440003',
      occurredAt: '2024-01-15T11:30:00Z',
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
        updatedAt: '2024-01-15T11:30:00Z',
        previousValues: {
          firstName: 'Johnny',
        },
      },
      triggerKey: 'user_updated',
      triggerLabel: 'User Updated',
      triggerDescription: 'Triggered when an existing user is updated',
    },
  },
  user_deactivated: {
    key: 'user_deactivated',
    label: 'User Deactivated',
    description: 'Triggered when a user is deactivated',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.user.deactivated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  session_created: {
    key: 'session_created',
    label: 'Session Created',
    description: 'Triggered when a user session is created',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.session.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  session_revoked: {
    key: 'session_revoked',
    label: 'Session Revoked',
    description: 'Triggered when a user session is revoked',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.session.revoked',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  login_failed: {
    key: 'login_failed',
    label: 'Login Failed',
    description: 'Triggered when a login attempt fails',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.login.failed',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  mfa_enabled: {
    key: 'mfa_enabled',
    label: 'MFA Enabled',
    description: 'Triggered when a user enables multi-factor authentication',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.mfa_enabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  mfa_disabled: {
    key: 'mfa_disabled',
    label: 'MFA Disabled',
    description: 'Triggered when a user disables multi-factor authentication',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'auth.mfa_disabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  tenant_created: {
    key: 'tenant_created',
    label: 'Tenant Created',
    description: 'Triggered when a new tenant is created',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'enterprise.tenant.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  tenant_updated: {
    key: 'tenant_updated',
    label: 'Tenant Updated',
    description: 'Triggered when a tenant is updated',
    operationType: ZapierOperationType.TRIGGER,
    webhookEventType: 'enterprise.tenant.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['zapier.trigger', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
} as const;

export const m1ZapierActionContractManifest: Record<ZapierActionKey, ZapierActionContract> = {
  create_user: {
    key: 'create_user',
    label: 'Create User',
    description: 'Creates a new user in the system',
    operationType: ZapierOperationType.ACTION,
    inputSchema: zapierActionInputSchemas.create_user.shape,
    outputSchema: zapierActionOutputSchemas.create_user.shape,
    requiredScopes: ['zapier.action', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{email}',
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  update_user: {
    key: 'update_user',
    label: 'Update User',
    description: 'Updates an existing user in the system',
    operationType: ZapierOperationType.ACTION,
    inputSchema: zapierActionInputSchemas.update_user.shape,
    outputSchema: zapierActionOutputSchemas.update_user.shape,
    requiredScopes: ['zapier.action', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}:{fields}',
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  assign_training: {
    key: 'assign_training',
    label: 'Assign Training',
    description: 'Assigns a training program to a user',
    operationType: ZapierOperationType.ACTION,
    inputSchema: zapierActionInputSchemas.assign_training.shape,
    outputSchema: zapierActionOutputSchemas.assign_training.shape,
    requiredScopes: ['zapier.action', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'assignment:{userId}:{trainingId}',
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  create_report: {
    key: 'create_report',
    label: 'Create Report',
    description: 'Generates a report based on specified criteria',
    operationType: ZapierOperationType.ACTION,
    inputSchema: zapierActionInputSchemas.create_report.shape,
    outputSchema: zapierActionOutputSchemas.create_report.shape,
    requiredScopes: ['zapier.action', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'report:{reportType}:{tenantId}',
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  send_notification: {
    key: 'send_notification',
    label: 'Send Notification',
    description: 'Sends a notification to a user',
    operationType: ZapierOperationType.ACTION,
    inputSchema: zapierActionInputSchemas.send_notification.shape,
    outputSchema: zapierActionOutputSchemas.send_notification.shape,
    requiredScopes: ['zapier.action', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'notification:{userId}:{timestamp}',
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
} as const;

export const m1ZapierSearchContractManifest: Record<ZapierSearchKey, ZapierSearchContract> = {
  find_user_by_email: {
    key: 'find_user_by_email',
    label: 'Find User by Email',
    description: 'Searches for a user by their email address',
    operationType: ZapierOperationType.SEARCH,
    matchingSemantics: 'exact',
    paginationSupported: false,
    inputSchema: zapierSearchInputSchemas.find_user_by_email.shape,
    outputSchema: zapierSearchOutputSchemas.find_user_by_email.shape,
    requiredScopes: ['zapier.search', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  find_training_by_name: {
    key: 'find_training_by_name',
    label: 'Find Training by Name',
    description: 'Searches for training programs by name',
    operationType: ZapierOperationType.SEARCH,
    matchingSemantics: 'case_insensitive',
    paginationSupported: true,
    inputSchema: zapierSearchInputSchemas.find_training_by_name.shape,
    outputSchema: {},
    requiredScopes: ['zapier.search', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
  find_department_by_code: {
    key: 'find_department_by_code',
    label: 'Find Department by Code',
    description: 'Searches for a department by its code',
    operationType: ZapierOperationType.SEARCH,
    matchingSemantics: 'exact',
    paginationSupported: false,
    inputSchema: zapierSearchInputSchemas.find_department_by_code.shape,
    outputSchema: zapierSearchOutputSchemas.find_department_by_code.shape,
    requiredScopes: ['zapier.search', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: ZAPIER_INTEGRATION_VERSION,
    deprecated: false,
  },
} as const;

export const m1ZapierIntegrationManifest: ZapierIntegrationMetadata = {
  integrationVersion: ZAPIER_INTEGRATION_VERSION,
  compatibilityNotes: ZAPIER_COMPATIBILITY_NOTES,
  supportedOperations: [
    ZapierOperationType.TRIGGER,
    ZapierOperationType.ACTION,
    ZapierOperationType.SEARCH,
  ],
  authRequirements: {
    oauthScopes: [
      'zapier.read',
      'zapier.write',
      'zapier.trigger',
      'zapier.action',
      'zapier.search',
    ],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
  },
};

export const isValidZapierTriggerKey = (key: string): key is ZapierTriggerKey => {
  return ZAPIER_TRIGGER_KEYS.includes(key as ZapierTriggerKey);
};

export const isValidZapierActionKey = (key: string): key is ZapierActionKey => {
  return ZAPIER_ACTION_KEYS.includes(key as ZapierActionKey);
};

export const isValidZapierSearchKey = (key: string): key is ZapierSearchKey => {
  return ZAPIER_SEARCH_KEYS.includes(key as ZapierSearchKey);
};

export const getTriggerContract = (key: ZapierTriggerKey): ZapierTriggerContract => {
  return m1ZapierTriggerContractManifest[key];
};

export const getActionContract = (key: ZapierActionKey): ZapierActionContract => {
  return m1ZapierActionContractManifest[key];
};

export const getSearchContract = (key: ZapierSearchKey): ZapierSearchContract => {
  return m1ZapierSearchContractManifest[key];
};

export const getAllZapierOperationContracts = (): ZapierOperationContract[] => {
  return [
    ...Object.values(m1ZapierTriggerContractManifest),
    ...Object.values(m1ZapierActionContractManifest),
    ...Object.values(m1ZapierSearchContractManifest),
  ];
};

export const validateZapierInput = (
  operationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (isValidZapierActionKey(operationKey)) {
    const result = zapierActionInputSchemas[operationKey].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  if (isValidZapierSearchKey(operationKey)) {
    const result = zapierSearchInputSchemas[operationKey].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  return { valid: false, errors: undefined };
};

export const buildZapierErrorResponse = (
  code: ZapierErrorCode,
  message: string,
  operationType: ZapierOperationType,
  operationKey: string,
  tenantId: string,
): ZapierOperationOutput => ({
  success: false,
  error: { code, message },
  metadata: {
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    operationKey,
  },
});

export const buildZapierSuccessResponse = (
  data: Record<string, unknown>,
  operationType: ZapierOperationType,
  operationKey: string,
  tenantId: string,
  idempotencyKey?: string,
): ZapierOperationOutput => ({
  success: true,
  data,
  metadata: {
    idempotencyKey,
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    operationKey,
  },
});
