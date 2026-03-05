import { z } from 'zod';

export const MakeComOperationType = {
  TEMPLATE_TRIGGER: 'template_trigger',
  TEMPLATE_ACTION: 'template_action',
} as const;

export type MakeComOperationType = (typeof MakeComOperationType)[keyof typeof MakeComOperationType];

export const makeComOperationTypeSchema = z.enum([
  MakeComOperationType.TEMPLATE_TRIGGER,
  MakeComOperationType.TEMPLATE_ACTION,
]);

export const MAKE_COM_INTEGRATION_VERSION = '1.0.0';
export const MAKE_COM_COMPATIBILITY_NOTES =
  'Requires OAuth2 client credentials with Make.com template scopes';

export const makeComIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedOperations: z.array(makeComOperationTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
  }),
});

export type MakeComIntegrationMetadata = z.infer<typeof makeComIntegrationMetadataSchema>;

export const makeComOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().max(255).optional(),
  scenarioId: z.string().optional(),
  moduleId: z.string().optional(),
});

export type MakeComOperationInput = z.infer<typeof makeComOperationInputSchema>;

export const makeComOperationOutputSchema = z.object({
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
      operationType: makeComOperationTypeSchema,
      operationKey: z.string(),
      scenarioId: z.string().optional(),
    })
    .optional(),
});

export type MakeComOperationOutput = z.infer<typeof makeComOperationOutputSchema>;

export const makeComOperationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  operationType: makeComOperationTypeSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  requiredScopes: z.array(z.string()),
  idempotencySupported: z.boolean(),
  tenantBindingRequired: z.boolean(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type MakeComOperationContract = z.infer<typeof makeComOperationContractSchema>;

export const MAKE_COM_TRIGGER_KEYS = [
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

export type MakeComTriggerKey = (typeof MAKE_COM_TRIGGER_KEYS)[number];

export const makeComTriggerPayloadSchema = z.object({
  eventType: z.string(),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
  triggerKey: z.string(),
  triggerLabel: z.string(),
  triggerDescription: z.string(),
  scenarioId: z.string().uuid(),
  scenarioName: z.string(),
  moduleId: z.string().uuid(),
  moduleType: z.string(),
});

export type MakeComTriggerPayload = z.infer<typeof makeComTriggerPayloadSchema>;

export const makeComTriggerContractSchema = makeComOperationContractSchema.extend({
  operationType: z.literal(MakeComOperationType.TEMPLATE_TRIGGER),
  webhookEventType: z.string(),
  scenarioId: z.string().uuid(),
  moduleId: z.string().uuid(),
  moduleType: z.string(),
  samplePayload: makeComTriggerPayloadSchema.optional(),
});

export type MakeComTriggerContract = z.infer<typeof makeComTriggerContractSchema>;

export const MAKE_COM_ACTION_KEYS = [
  'create_user',
  'update_user',
  'assign_training',
  'create_report',
  'send_notification',
] as const;

export type MakeComActionKey = (typeof MAKE_COM_ACTION_KEYS)[number];

export const makeComActionInputSchemas = {
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

export type MakeComActionInputSchemas = z.infer<
  (typeof makeComActionInputSchemas)[keyof typeof makeComActionInputSchemas]
>;

export const makeComActionOutputSchemas = {
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

export const makeComActionContractSchema = makeComOperationContractSchema.extend({
  operationType: z.literal(MakeComOperationType.TEMPLATE_ACTION),
  idempotencyKeyFormat: z.string().optional(),
  scenarioId: z.string().uuid(),
  moduleId: z.string().uuid(),
  moduleType: z.string(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type MakeComActionContract = z.infer<typeof makeComActionContractSchema>;

export const MAKE_COM_OUTPUT_INVARIANTS = {
  ALWAYS_INCLUDE_ID: true,
  NULLABLE_OPTIONAL_FIELDS: true,
  DETERMINISTIC_FIELD_INCLUSION: true,
  STABLE_FIELD_NAMING: true,
  SCENARIO_METADATA_REQUIRED: true,
  MODULE_CONFIGURATION_REQUIRED: true,
} as const;

export type MakeComOutputInvariants = typeof MAKE_COM_OUTPUT_INVARIANTS;

export const MAKE_COM_ERROR_CODES = {
  INVALID_INPUT: 'MAKE_COM_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'MAKE_COM_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'MAKE_COM_TENANT_MISMATCH',
  NOT_FOUND: 'MAKE_COM_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'MAKE_COM_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'MAKE_COM_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'MAKE_COM_AUTH_FAILED',
  SCENARIO_NOT_FOUND: 'MAKE_COM_SCENARIO_NOT_FOUND',
  SCENARIO_DISABLED: 'MAKE_COM_SCENARIO_DISABLED',
  MODULE_NOT_FOUND: 'MAKE_COM_MODULE_NOT_FOUND',
} as const;

export type MakeComErrorCode = (typeof MAKE_COM_ERROR_CODES)[keyof typeof MAKE_COM_ERROR_CODES];

export const m1MakeComTriggerContractManifest: Record<MakeComTriggerKey, MakeComTriggerContract> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Triggered when a new user is created in the system',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.user.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440101',
    moduleType: 'HTTP',
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
      scenarioId: '550e8400-e29b-41d4-a716-446655440001',
      scenarioName: 'User Created Scenario',
      moduleId: '550e8400-e29b-41d4-a716-446655440101',
      moduleType: 'HTTP',
    },
  },
  user_updated: {
    key: 'user_updated',
    label: 'User Updated',
    description: 'Triggered when an existing user is updated',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.user.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440102',
    moduleType: 'HTTP',
  },
  user_deactivated: {
    key: 'user_deactivated',
    label: 'User Deactivated',
    description: 'Triggered when a user is deactivated',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.user.deactivated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440103',
    moduleType: 'HTTP',
  },
  session_created: {
    key: 'session_created',
    label: 'Session Created',
    description: 'Triggered when a user session is created',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.session.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440104',
    moduleType: 'HTTP',
  },
  session_revoked: {
    key: 'session_revoked',
    label: 'Session Revoked',
    description: 'Triggered when a user session is revoked',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.session.revoked',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440105',
    moduleType: 'HTTP',
  },
  login_failed: {
    key: 'login_failed',
    label: 'Login Failed',
    description: 'Triggered when a login attempt fails',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.login.failed',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440106',
    moduleType: 'HTTP',
  },
  mfa_enabled: {
    key: 'mfa_enabled',
    label: 'MFA Enabled',
    description: 'Triggered when a user enables multi-factor authentication',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.mfa_enabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440107',
    moduleType: 'HTTP',
  },
  mfa_disabled: {
    key: 'mfa_disabled',
    label: 'MFA Disabled',
    description: 'Triggered when a user disables multi-factor authentication',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.mfa_disabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440108',
    moduleType: 'HTTP',
  },
  tenant_created: {
    key: 'tenant_created',
    label: 'Tenant Created',
    description: 'Triggered when a new tenant is created',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'enterprise.tenant.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440109',
    moduleType: 'HTTP',
  },
  tenant_updated: {
    key: 'tenant_updated',
    label: 'Tenant Updated',
    description: 'Triggered when a tenant is updated',
    operationType: MakeComOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'enterprise.tenant.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['makecom.template', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440001',
    moduleId: '550e8400-e29b-41d4-a716-446655440110',
    moduleType: 'HTTP',
  },
} as const;

export const m1MakeComActionContractManifest: Record<MakeComActionKey, MakeComActionContract> = {
  create_user: {
    key: 'create_user',
    label: 'Create User',
    description: 'Creates a new user in the system',
    operationType: MakeComOperationType.TEMPLATE_ACTION,
    inputSchema: makeComActionInputSchemas.create_user.shape,
    outputSchema: makeComActionOutputSchemas.create_user.shape,
    requiredScopes: ['makecom.template', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{email}',
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440002',
    moduleId: '550e8400-e29b-41d4-a716-446655440201',
    moduleType: 'HTTP',
  },
  update_user: {
    key: 'update_user',
    label: 'Update User',
    description: 'Updates an existing user in the system',
    operationType: MakeComOperationType.TEMPLATE_ACTION,
    inputSchema: makeComActionInputSchemas.update_user.shape,
    outputSchema: makeComActionOutputSchemas.update_user.shape,
    requiredScopes: ['makecom.template', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}:{fields}',
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440002',
    moduleId: '550e8400-e29b-41d4-a716-446655440202',
    moduleType: 'HTTP',
  },
  assign_training: {
    key: 'assign_training',
    label: 'Assign Training',
    description: 'Assigns a training program to a user',
    operationType: MakeComOperationType.TEMPLATE_ACTION,
    inputSchema: makeComActionInputSchemas.assign_training.shape,
    outputSchema: makeComActionOutputSchemas.assign_training.shape,
    requiredScopes: ['makecom.template', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'assignment:{userId}:{trainingId}',
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440002',
    moduleId: '550e8400-e29b-41d4-a716-446655440203',
    moduleType: 'HTTP',
  },
  create_report: {
    key: 'create_report',
    label: 'Create Report',
    description: 'Generates a report based on specified criteria',
    operationType: MakeComOperationType.TEMPLATE_ACTION,
    inputSchema: makeComActionInputSchemas.create_report.shape,
    outputSchema: makeComActionOutputSchemas.create_report.shape,
    requiredScopes: ['makecom.template', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'report:{reportType}:{tenantId}',
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440002',
    moduleId: '550e8400-e29b-41d4-a716-446655440204',
    moduleType: 'HTTP',
  },
  send_notification: {
    key: 'send_notification',
    label: 'Send Notification',
    description: 'Sends a notification to a user',
    operationType: MakeComOperationType.TEMPLATE_ACTION,
    inputSchema: makeComActionInputSchemas.send_notification.shape,
    outputSchema: makeComActionOutputSchemas.send_notification.shape,
    requiredScopes: ['makecom.template', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'notification:{userId}:{timestamp}',
    tenantBindingRequired: true,
    version: MAKE_COM_INTEGRATION_VERSION,
    deprecated: false,
    scenarioId: '550e8400-e29b-41d4-a716-446655440002',
    moduleId: '550e8400-e29b-41d4-a716-446655440205',
    moduleType: 'HTTP',
  },
} as const;

export const m1MakeComIntegrationManifest: MakeComIntegrationMetadata = {
  integrationVersion: MAKE_COM_INTEGRATION_VERSION,
  compatibilityNotes: MAKE_COM_COMPATIBILITY_NOTES,
  supportedOperations: [
    MakeComOperationType.TEMPLATE_TRIGGER,
    MakeComOperationType.TEMPLATE_ACTION,
  ],
  authRequirements: {
    oauthScopes: ['makecom.read', 'makecom.write', 'makecom.template'],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
  },
};

export const isValidMakeComTriggerKey = (key: string): key is MakeComTriggerKey => {
  return MAKE_COM_TRIGGER_KEYS.includes(key as MakeComTriggerKey);
};

export const isValidMakeComActionKey = (key: string): key is MakeComActionKey => {
  return MAKE_COM_ACTION_KEYS.includes(key as MakeComActionKey);
};

export const getMakeComTriggerContract = (key: MakeComTriggerKey): MakeComTriggerContract => {
  return m1MakeComTriggerContractManifest[key];
};

export const getMakeComActionContract = (key: MakeComActionKey): MakeComActionContract => {
  return m1MakeComActionContractManifest[key];
};

export const getAllMakeComOperationContracts = (): MakeComOperationContract[] => {
  return [
    ...Object.values(m1MakeComTriggerContractManifest),
    ...Object.values(m1MakeComActionContractManifest),
  ];
};

export const validateMakeComInput = (
  operationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (isValidMakeComActionKey(operationKey)) {
    const result = makeComActionInputSchemas[operationKey].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  return { valid: false, errors: undefined };
};

export const buildMakeComErrorResponse = (
  code: MakeComErrorCode,
  message: string,
  operationType: MakeComOperationType,
  operationKey: string,
  tenantId: string,
  scenarioId?: string,
): MakeComOperationOutput => ({
  success: false,
  error: { code, message },
  metadata: {
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    operationKey,
    scenarioId,
  },
});

export const buildMakeComSuccessResponse = (
  data: Record<string, unknown>,
  operationType: MakeComOperationType,
  operationKey: string,
  tenantId: string,
  idempotencyKey?: string,
  scenarioId?: string,
): MakeComOperationOutput => ({
  success: true,
  data,
  metadata: {
    idempotencyKey,
    tenantId,
    timestamp: new Date().toISOString(),
    operationType,
    operationKey,
    scenarioId,
  },
});
