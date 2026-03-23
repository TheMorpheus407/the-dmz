import { z } from 'zod';

export const N8nOperationType = {
  TEMPLATE_TRIGGER: 'template_trigger',
  TEMPLATE_ACTION: 'template_action',
} as const;

export type N8nOperationType = (typeof N8nOperationType)[keyof typeof N8nOperationType];

export const n8nOperationTypeSchema = z.enum([
  N8nOperationType.TEMPLATE_TRIGGER,
  N8nOperationType.TEMPLATE_ACTION,
]);

export const N8N_INTEGRATION_VERSION = '1.0.0';
export const N8N_COMPATIBILITY_NOTES =
  'Requires OAuth2 client credentials with n8n template scopes';

export const n8nIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedOperations: z.array(n8nOperationTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
  }),
});

export type N8nIntegrationMetadata = z.infer<typeof n8nIntegrationMetadataSchema>;

export const n8nOperationInputSchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().max(255).optional(),
  templateId: z.string().optional(),
  nodeId: z.string().optional(),
});

export type N8nOperationInput = z.infer<typeof n8nOperationInputSchema>;

export const n8nOperationOutputSchema = z.object({
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
      operationType: n8nOperationTypeSchema,
      operationKey: z.string(),
      templateId: z.string().optional(),
      nodeId: z.string().optional(),
    })
    .optional(),
});

export type N8nOperationOutput = z.infer<typeof n8nOperationOutputSchema>;

export const n8nOperationContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  operationType: n8nOperationTypeSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  requiredScopes: z.array(z.string()),
  idempotencySupported: z.boolean(),
  tenantBindingRequired: z.boolean(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type N8nOperationContract = z.infer<typeof n8nOperationContractSchema>;

export const N8N_TRIGGER_KEYS = [
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

export type N8nTriggerKey = (typeof N8N_TRIGGER_KEYS)[number];

export const n8nTriggerPayloadSchema = z.object({
  eventType: z.string(),
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  tenantId: z.string().uuid(),
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
  triggerKey: z.string(),
  triggerLabel: z.string(),
  triggerDescription: z.string(),
  templateId: z.string().uuid(),
  templateName: z.string(),
  nodeId: z.string().uuid(),
  nodeType: z.string(),
});

export type N8nTriggerPayload = z.infer<typeof n8nTriggerPayloadSchema>;

export const n8nTriggerContractSchema = n8nOperationContractSchema.extend({
  operationType: z.literal(N8nOperationType.TEMPLATE_TRIGGER),
  webhookEventType: z.string(),
  templateId: z.string().uuid(),
  nodeId: z.string().uuid(),
  nodeType: z.string(),
  samplePayload: n8nTriggerPayloadSchema.optional(),
});

export type N8nTriggerContract = z.infer<typeof n8nTriggerContractSchema>;

export const N8N_ACTION_KEYS = [
  'create_user',
  'update_user',
  'assign_training',
  'create_report',
  'send_notification',
] as const;

export type N8nActionKey = (typeof N8N_ACTION_KEYS)[number];

export const n8nActionInputSchemas = {
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

export type N8nActionInputSchemas = z.infer<
  (typeof n8nActionInputSchemas)[keyof typeof n8nActionInputSchemas]
>;

export const n8nActionOutputSchemas = {
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

export const n8nActionContractSchema = n8nOperationContractSchema.extend({
  operationType: z.literal(N8nOperationType.TEMPLATE_ACTION),
  idempotencyKeyFormat: z.string().optional(),
  templateId: z.string().uuid(),
  nodeId: z.string().uuid(),
  nodeType: z.string(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type N8nActionContract = z.infer<typeof n8nActionContractSchema>;

export const N8N_OUTPUT_INVARIANTS = {
  ALWAYS_INCLUDE_ID: true,
  NULLABLE_OPTIONAL_FIELDS: true,
  DETERMINISTIC_FIELD_INCLUSION: true,
  STABLE_FIELD_NAMING: true,
  TEMPLATE_METADATA_REQUIRED: true,
  NODE_CONFIGURATION_REQUIRED: true,
} as const;

export type N8nOutputInvariants = typeof N8N_OUTPUT_INVARIANTS;

export const N8N_ERROR_CODES = {
  INVALID_INPUT: 'N8N_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'N8N_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'N8N_TENANT_MISMATCH',
  NOT_FOUND: 'N8N_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'N8N_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'N8N_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'N8N_AUTH_FAILED',
  TEMPLATE_NOT_FOUND: 'N8N_TEMPLATE_NOT_FOUND',
  TEMPLATE_DISABLED: 'N8N_TEMPLATE_DISABLED',
  NODE_NOT_FOUND: 'N8N_NODE_NOT_FOUND',
} as const;

export type N8nErrorCode = (typeof N8N_ERROR_CODES)[keyof typeof N8N_ERROR_CODES];

export const m1N8nTriggerContractManifest: Record<N8nTriggerKey, N8nTriggerContract> = {
  user_created: {
    key: 'user_created',
    label: 'User Created',
    description: 'Triggered when a new user is created in the system',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.user.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440101',
    nodeType: 'n8n-nodes-base.webhook',
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
      templateId: '550e8400-e29b-41d4-a716-446655440001',
      templateName: 'User Created Workflow',
      nodeId: '550e8400-e29b-41d4-a716-446655440101',
      nodeType: 'n8n-nodes-base.webhook',
    },
  },
  user_updated: {
    key: 'user_updated',
    label: 'User Updated',
    description: 'Triggered when an existing user is updated',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.user.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440102',
    nodeType: 'n8n-nodes-base.webhook',
  },
  user_deactivated: {
    key: 'user_deactivated',
    label: 'User Deactivated',
    description: 'Triggered when a user is deactivated',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.user.deactivated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440103',
    nodeType: 'n8n-nodes-base.webhook',
  },
  session_created: {
    key: 'session_created',
    label: 'Session Created',
    description: 'Triggered when a user session is created',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.session.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440104',
    nodeType: 'n8n-nodes-base.webhook',
  },
  session_revoked: {
    key: 'session_revoked',
    label: 'Session Revoked',
    description: 'Triggered when a user session is revoked',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.session.revoked',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440105',
    nodeType: 'n8n-nodes-base.webhook',
  },
  login_failed: {
    key: 'login_failed',
    label: 'Login Failed',
    description: 'Triggered when a login attempt fails',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.login.failed',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440106',
    nodeType: 'n8n-nodes-base.webhook',
  },
  mfa_enabled: {
    key: 'mfa_enabled',
    label: 'MFA Enabled',
    description: 'Triggered when a user enables multi-factor authentication',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.mfa_enabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440107',
    nodeType: 'n8n-nodes-base.webhook',
  },
  mfa_disabled: {
    key: 'mfa_disabled',
    label: 'MFA Disabled',
    description: 'Triggered when a user disables multi-factor authentication',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'auth.mfa_disabled',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440108',
    nodeType: 'n8n-nodes-base.webhook',
  },
  tenant_created: {
    key: 'tenant_created',
    label: 'Tenant Created',
    description: 'Triggered when a new tenant is created',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'enterprise.tenant.created',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440109',
    nodeType: 'n8n-nodes-base.webhook',
  },
  tenant_updated: {
    key: 'tenant_updated',
    label: 'Tenant Updated',
    description: 'Triggered when a tenant is updated',
    operationType: N8nOperationType.TEMPLATE_TRIGGER,
    webhookEventType: 'enterprise.tenant.updated',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['n8n.template', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440001',
    nodeId: '550e8400-e29b-41d4-a716-446655440110',
    nodeType: 'n8n-nodes-base.webhook',
  },
} as const;

export const m1N8nActionContractManifest: Record<N8nActionKey, N8nActionContract> = {
  create_user: {
    key: 'create_user',
    label: 'Create User',
    description: 'Creates a new user in the system',
    operationType: N8nOperationType.TEMPLATE_ACTION,
    inputSchema: n8nActionInputSchemas.create_user.shape,
    outputSchema: n8nActionOutputSchemas.create_user.shape,
    requiredScopes: ['n8n.template', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{email}',
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440002',
    nodeId: '550e8400-e29b-41d4-a716-446655440201',
    nodeType: 'n8n-nodes-base.httpRequest',
  },
  update_user: {
    key: 'update_user',
    label: 'Update User',
    description: 'Updates an existing user in the system',
    operationType: N8nOperationType.TEMPLATE_ACTION,
    inputSchema: n8nActionInputSchemas.update_user.shape,
    outputSchema: n8nActionOutputSchemas.update_user.shape,
    requiredScopes: ['n8n.template', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}:{fields}',
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440002',
    nodeId: '550e8400-e29b-41d4-a716-446655440202',
    nodeType: 'n8n-nodes-base.httpRequest',
  },
  assign_training: {
    key: 'assign_training',
    label: 'Assign Training',
    description: 'Assigns a training program to a user',
    operationType: N8nOperationType.TEMPLATE_ACTION,
    inputSchema: n8nActionInputSchemas.assign_training.shape,
    outputSchema: n8nActionOutputSchemas.assign_training.shape,
    requiredScopes: ['n8n.template', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'assignment:{userId}:{trainingId}',
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440002',
    nodeId: '550e8400-e29b-41d4-a716-446655440203',
    nodeType: 'n8n-nodes-base.httpRequest',
  },
  create_report: {
    key: 'create_report',
    label: 'Create Report',
    description: 'Generates a report based on specified criteria',
    operationType: N8nOperationType.TEMPLATE_ACTION,
    inputSchema: n8nActionInputSchemas.create_report.shape,
    outputSchema: n8nActionOutputSchemas.create_report.shape,
    requiredScopes: ['n8n.template', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'report:{reportType}:{tenantId}',
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440002',
    nodeId: '550e8400-e29b-41d4-a716-446655440204',
    nodeType: 'n8n-nodes-base.httpRequest',
  },
  send_notification: {
    key: 'send_notification',
    label: 'Send Notification',
    description: 'Sends a notification to a user',
    operationType: N8nOperationType.TEMPLATE_ACTION,
    inputSchema: n8nActionInputSchemas.send_notification.shape,
    outputSchema: n8nActionOutputSchemas.send_notification.shape,
    requiredScopes: ['n8n.template', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'notification:{userId}:{timestamp}',
    tenantBindingRequired: true,
    version: N8N_INTEGRATION_VERSION,
    deprecated: false,
    templateId: '550e8400-e29b-41d4-a716-446655440002',
    nodeId: '550e8400-e29b-41d4-a716-446655440205',
    nodeType: 'n8n-nodes-base.httpRequest',
  },
} as const;

export const m1N8nIntegrationManifest: N8nIntegrationMetadata = {
  integrationVersion: N8N_INTEGRATION_VERSION,
  compatibilityNotes: N8N_COMPATIBILITY_NOTES,
  supportedOperations: [N8nOperationType.TEMPLATE_TRIGGER, N8nOperationType.TEMPLATE_ACTION],
  authRequirements: {
    oauthScopes: ['n8n.read', 'n8n.write', 'n8n.template'],
    apiKeyScopes: ['integrations'],
    requiresTenantBinding: true,
  },
};

export const isValidN8nTriggerKey = (key: string): key is N8nTriggerKey => {
  return N8N_TRIGGER_KEYS.includes(key as N8nTriggerKey);
};

export const isValidN8nActionKey = (key: string): key is N8nActionKey => {
  return N8N_ACTION_KEYS.includes(key as N8nActionKey);
};

export const getN8nTriggerContract = (key: N8nTriggerKey): N8nTriggerContract => {
  return m1N8nTriggerContractManifest[key];
};

export const getN8nActionContract = (key: N8nActionKey): N8nActionContract => {
  return m1N8nActionContractManifest[key];
};

export const getAllN8nOperationContracts = (): N8nOperationContract[] => {
  return [
    ...Object.values(m1N8nTriggerContractManifest),
    ...Object.values(m1N8nActionContractManifest),
  ];
};

export const validateN8nInput = (
  operationKey: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (isValidN8nActionKey(operationKey)) {
    const result = n8nActionInputSchemas[operationKey].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  return { valid: false, errors: undefined };
};

export interface BuildN8nErrorResponseOptions {
  code: N8nErrorCode;
  message: string;
  operationType: N8nOperationType;
  operationKey: string;
  tenantId: string;
  templateId?: string;
}

export const buildN8nErrorResponse = (
  options: BuildN8nErrorResponseOptions,
): N8nOperationOutput => ({
  success: false,
  error: { code: options.code, message: options.message },
  metadata: {
    tenantId: options.tenantId,
    timestamp: new Date().toISOString(),
    operationType: options.operationType,
    operationKey: options.operationKey,
    templateId: options.templateId,
  },
});

export interface BuildN8nSuccessResponseOptions {
  data: Record<string, unknown>;
  operationType: N8nOperationType;
  operationKey: string;
  tenantId: string;
  idempotencyKey?: string;
  templateId?: string;
}

export const buildN8nSuccessResponse = (
  options: BuildN8nSuccessResponseOptions,
): N8nOperationOutput => ({
  success: true,
  data: options.data,
  metadata: {
    idempotencyKey: options.idempotencyKey,
    tenantId: options.tenantId,
    timestamp: new Date().toISOString(),
    operationType: options.operationType,
    operationKey: options.operationKey,
    templateId: options.templateId,
  },
});
