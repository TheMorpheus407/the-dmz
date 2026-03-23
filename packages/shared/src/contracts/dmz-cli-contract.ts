import { z } from 'zod';

export const DmzCliCommandType = {
  QUERY: 'query',
  MUTATION: 'mutation',
  ADMIN: 'admin',
} as const;

export type DmzCliCommandType = (typeof DmzCliCommandType)[keyof typeof DmzCliCommandType];

export const dmzCliCommandTypeSchema = z.enum([
  DmzCliCommandType.QUERY,
  DmzCliCommandType.MUTATION,
  DmzCliCommandType.ADMIN,
]);

export const DMZ_CLI_VERSION = '1.0.0';
export const DMZ_CLI_COMPATIBILITY_NOTES = 'Requires API key or PAT with dmz-cli command scopes';

export const dmzCliIntegrationMetadataSchema = z.object({
  integrationVersion: z.string(),
  compatibilityNotes: z.string(),
  supportedCommandTypes: z.array(dmzCliCommandTypeSchema),
  authRequirements: z.object({
    oauthScopes: z.array(z.string()),
    apiKeyScopes: z.array(z.string()),
    requiresTenantBinding: z.boolean(),
  }),
});

export type DmzCliIntegrationMetadata = z.infer<typeof dmzCliIntegrationMetadataSchema>;

export const dmzCliCommandInputSchema = z.object({
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().max(255).optional(),
  command: z.string(),
  args: z.record(z.unknown()).optional(),
});

export type DmzCliCommandInput = z.infer<typeof dmzCliCommandInputSchema>;

export const dmzCliCommandOutputSchema = z.object({
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
      commandType: dmzCliCommandTypeSchema,
      command: z.string(),
      executionTimeMs: z.number().optional(),
    })
    .optional(),
});

export type DmzCliCommandOutput = z.infer<typeof dmzCliCommandOutputSchema>;

export const dmzCliCommandContractSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  commandType: dmzCliCommandTypeSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  requiredScopes: z.array(z.string()),
  idempotencySupported: z.boolean(),
  tenantBindingRequired: z.boolean(),
  version: z.string(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
  outputFormat: z.enum(['json', 'csv', 'text']),
});

export type DmzCliCommandContract = z.infer<typeof dmzCliCommandContractSchema>;

export const DMZ_CLI_QUERY_COMMANDS = [
  'get-user',
  'list-users',
  'get-training',
  'list-trainings',
  'get-department',
  'list-departments',
  'get-tenant',
  'list-tenants',
] as const;

export type DmzCliQueryCommand = (typeof DMZ_CLI_QUERY_COMMANDS)[number];

export const DMZ_CLI_MUTATION_COMMANDS = [
  'create-user',
  'update-user',
  'delete-user',
  'assign-training',
  'create-report',
  'send-notification',
] as const;

export type DmzCliMutationCommand = (typeof DMZ_CLI_MUTATION_COMMANDS)[number];

export const DMZ_CLI_ADMIN_COMMANDS = [
  'create-tenant',
  'update-tenant',
  'create-api-key',
  'revoke-api-key',
  'list-api-keys',
  'export-audit-log',
] as const;

export type DmzCliAdminCommand = (typeof DMZ_CLI_ADMIN_COMMANDS)[number];

export const dmzCliQueryInputSchemas = {
  'get-user': z.object({
    userId: z.string().uuid(),
  }),
  'list-users': z.object({
    departmentId: z.string().uuid().optional(),
    role: z.enum(['user', 'admin', 'manager']).optional(),
    status: z.enum(['active', 'inactive', 'deactivated']).optional(),
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  }),
  'get-training': z.object({
    trainingId: z.string().uuid(),
  }),
  'list-trainings': z.object({
    category: z.string().optional(),
    status: z.enum(['active', 'deprecated', 'archived']).optional(),
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  }),
  'get-department': z.object({
    departmentId: z.string().uuid(),
  }),
  'list-departments': z.object({
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  }),
  'get-tenant': z.object({
    tenantId: z.string().uuid(),
  }),
  'list-tenants': z.object({
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  }),
} as const;

export type DmzCliQueryInputSchemas = z.infer<
  (typeof dmzCliQueryInputSchemas)[keyof typeof dmzCliQueryInputSchemas]
>;

export const dmzCliQueryOutputSchemas = {
  'get-user': z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    department: z.string().uuid().nullable(),
    role: z.string(),
    status: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
  }),
  'list-users': z.array(
    z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      department: z.string().uuid().nullable(),
      role: z.string(),
      status: z.string(),
    }),
  ),
  'get-training': z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    status: z.enum(['active', 'deprecated', 'archived']),
    createdAt: z.string().datetime(),
  }),
  'list-trainings': z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().nullable(),
      category: z.string().nullable(),
      status: z.enum(['active', 'deprecated', 'archived']),
    }),
  ),
  'get-department': z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }),
  'list-departments': z.array(
    z.object({
      id: z.string().uuid(),
      code: z.string(),
      name: z.string(),
    }),
  ),
  'get-tenant': z.object({
    id: z.string().uuid(),
    name: z.string(),
    tier: z.string(),
    status: z.string(),
    createdAt: z.string().datetime(),
  }),
  'list-tenants': z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      tier: z.string(),
      status: z.string(),
    }),
  ),
} as const;

export const dmzCliMutationInputSchemas = {
  'create-user': z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    department: z.string().uuid().optional(),
    role: z.enum(['user', 'admin', 'manager']).default('user'),
  }),
  'update-user': z.object({
    userId: z.string().uuid(),
    email: z.string().email().optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    department: z.string().uuid().optional(),
    role: z.enum(['user', 'admin', 'manager']).optional(),
    status: z.enum(['active', 'inactive', 'deactivated']).optional(),
  }),
  'delete-user': z.object({
    userId: z.string().uuid(),
  }),
  'assign-training': z.object({
    userId: z.string().uuid(),
    trainingId: z.string().uuid(),
    deadline: z.string().datetime().optional(),
    assignedBy: z.string().uuid().optional(),
  }),
  'create-report': z.object({
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
  'send-notification': z.object({
    userId: z.string().uuid(),
    template: z.string().min(1).max(100),
    data: z.record(z.unknown()),
    channel: z.enum(['email', 'in_app', 'sms']).default('email'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  }),
} as const;

export type DmzCliMutationInputSchemas = z.infer<
  (typeof dmzCliMutationInputSchemas)[keyof typeof dmzCliMutationInputSchemas]
>;

export const dmzCliMutationOutputSchemas = {
  'create-user': z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    department: z.string().uuid().nullable(),
    role: z.string(),
    status: z.string(),
    createdAt: z.string().datetime(),
  }),
  'update-user': z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    department: z.string().uuid().nullable(),
    role: z.string(),
    status: z.string(),
    updatedAt: z.string().datetime(),
  }),
  'delete-user': z.object({
    id: z.string().uuid(),
    status: z.string(),
    deletedAt: z.string().datetime(),
  }),
  'assign-training': z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    trainingId: z.string().uuid(),
    deadline: z.string().datetime().nullable(),
    assignedAt: z.string().datetime(),
    status: z.enum(['pending', 'in_progress', 'completed', 'expired']),
  }),
  'create-report': z.object({
    id: z.string().uuid(),
    reportType: z.string(),
    status: z.enum(['generating', 'ready', 'failed']),
    downloadUrl: z.string().url().nullable(),
    expiresAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  }),
  'send-notification': z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    template: z.string(),
    channel: z.string(),
    status: z.enum(['queued', 'sent', 'delivered', 'failed']),
    sentAt: z.string().datetime().nullable(),
  }),
} as const;

export const dmzCliAdminInputSchemas = {
  'create-tenant': z.object({
    name: z.string().min(1).max(255),
    tier: z.enum(['basic', 'professional', 'enterprise']),
  }),
  'update-tenant': z.object({
    tenantId: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    tier: z.enum(['basic', 'professional', 'enterprise']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  }),
  'create-api-key': z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.string()),
    expiresAt: z.string().datetime().optional(),
  }),
  'revoke-api-key': z.object({
    keyId: z.string().uuid(),
  }),
  'list-api-keys': z.object({
    tenantId: z.string().uuid().optional(),
  }),
  'export-audit-log': z.object({
    tenantId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    format: z.enum(['json', 'csv']).default('json'),
  }),
} as const;

export type DmzCliAdminInputSchemas = z.infer<
  (typeof dmzCliAdminInputSchemas)[keyof typeof dmzCliAdminInputSchemas]
>;

export const dmzCliAdminOutputSchemas = {
  'create-tenant': z.object({
    id: z.string().uuid(),
    name: z.string(),
    tier: z.string(),
    status: z.string(),
    createdAt: z.string().datetime(),
  }),
  'update-tenant': z.object({
    id: z.string().uuid(),
    name: z.string(),
    tier: z.string(),
    status: z.string(),
    updatedAt: z.string().datetime(),
  }),
  'create-api-key': z.object({
    id: z.string().uuid(),
    name: z.string(),
    key: z.string(),
    scopes: z.array(z.string()),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime().nullable(),
  }),
  'revoke-api-key': z.object({
    id: z.string().uuid(),
    status: z.string(),
    revokedAt: z.string().datetime(),
  }),
  'list-api-keys': z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      scopes: z.array(z.string()),
      createdAt: z.string().datetime(),
      expiresAt: z.string().datetime().nullable(),
      lastUsedAt: z.string().datetime().nullable(),
    }),
  ),
  'export-audit-log': z.object({
    downloadUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  }),
} as const;

export const DMZ_CLI_OUTPUT_INVARIANTS = {
  ALWAYS_INCLUDE_ID: true,
  NULLABLE_OPTIONAL_FIELDS: true,
  DETERMINISTIC_FIELD_INCLUSION: true,
  STABLE_FIELD_NAMING: true,
  EXECUTION_TIME_TRACKING: true,
  OUTPUT_FORMAT_SUPPORT: true,
} as const;

export type DmzCliOutputInvariants = typeof DMZ_CLI_OUTPUT_INVARIANTS;

export const DMZ_CLI_ERROR_CODES = {
  INVALID_INPUT: 'DMZ_CLI_INVALID_INPUT',
  INSUFFICIENT_SCOPE: 'DMZ_CLI_INSUFFICIENT_SCOPE',
  TENANT_MISMATCH: 'DMZ_CLI_TENANT_MISMATCH',
  NOT_FOUND: 'DMZ_CLI_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'DMZ_CLI_IDEMPOTENCY_CONFLICT',
  RATE_LIMIT_EXCEEDED: 'DMZ_CLI_RATE_LIMIT_EXCEEDED',
  AUTH_FAILED: 'DMZ_CLI_AUTH_FAILED',
  COMMAND_NOT_FOUND: 'DMZ_CLI_COMMAND_NOT_FOUND',
  PERMISSION_DENIED: 'DMZ_CLI_PERMISSION_DENIED',
} as const;

export type DmzCliErrorCode = (typeof DMZ_CLI_ERROR_CODES)[keyof typeof DMZ_CLI_ERROR_CODES];

export const dmzCliQueryContractSchema = dmzCliCommandContractSchema.extend({
  commandType: z.literal(DmzCliCommandType.QUERY),
  paginationSupported: z.boolean().default(true),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type DmzCliQueryContract = z.infer<typeof dmzCliQueryContractSchema>;

export const dmzCliMutationContractSchema = dmzCliCommandContractSchema.extend({
  commandType: z.literal(DmzCliCommandType.MUTATION),
  idempotencyKeyFormat: z.string().optional(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type DmzCliMutationContract = z.infer<typeof dmzCliMutationContractSchema>;

export const dmzCliAdminContractSchema = dmzCliCommandContractSchema.extend({
  commandType: z.literal(DmzCliCommandType.ADMIN),
  idempotencyKeyFormat: z.string().optional(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export type DmzCliAdminContract = z.infer<typeof dmzCliAdminContractSchema>;

export const m1DmzCliQueryContractManifest: Record<DmzCliQueryCommand, DmzCliQueryContract> = {
  'get-user': {
    key: 'get-user',
    label: 'Get User',
    description: 'Retrieves a single user by ID',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['get-user'].shape,
    outputSchema: dmzCliQueryOutputSchemas['get-user'].shape,
    requiredScopes: ['dmz_cli.query', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: false,
  },
  'list-users': {
    key: 'list-users',
    label: 'List Users',
    description: 'Lists users with optional filtering and pagination',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['list-users'].shape,
    outputSchema: {},
    requiredScopes: ['dmz_cli.query', 'users:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: true,
  },
  'get-training': {
    key: 'get-training',
    label: 'Get Training',
    description: 'Retrieves a single training by ID',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['get-training'].shape,
    outputSchema: dmzCliQueryOutputSchemas['get-training'].shape,
    requiredScopes: ['dmz_cli.query', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: false,
  },
  'list-trainings': {
    key: 'list-trainings',
    label: 'List Trainings',
    description: 'Lists trainings with optional filtering and pagination',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['list-trainings'].shape,
    outputSchema: {},
    requiredScopes: ['dmz_cli.query', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: true,
  },
  'get-department': {
    key: 'get-department',
    label: 'Get Department',
    description: 'Retrieves a single department by ID',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['get-department'].shape,
    outputSchema: dmzCliQueryOutputSchemas['get-department'].shape,
    requiredScopes: ['dmz_cli.query', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: false,
  },
  'list-departments': {
    key: 'list-departments',
    label: 'List Departments',
    description: 'Lists departments with pagination',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['list-departments'].shape,
    outputSchema: {},
    requiredScopes: ['dmz_cli.query', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: true,
  },
  'get-tenant': {
    key: 'get-tenant',
    label: 'Get Tenant',
    description: 'Retrieves a single tenant by ID',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['get-tenant'].shape,
    outputSchema: dmzCliQueryOutputSchemas['get-tenant'].shape,
    requiredScopes: ['dmz_cli.admin', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: false,
  },
  'list-tenants': {
    key: 'list-tenants',
    label: 'List Tenants',
    description: 'Lists tenants with pagination',
    commandType: DmzCliCommandType.QUERY,
    inputSchema: dmzCliQueryInputSchemas['list-tenants'].shape,
    outputSchema: {},
    requiredScopes: ['dmz_cli.admin', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
    paginationSupported: true,
  },
} as const;

export const m1DmzCliMutationContractManifest: Record<
  DmzCliMutationCommand,
  DmzCliMutationContract
> = {
  'create-user': {
    key: 'create-user',
    label: 'Create User',
    description: 'Creates a new user in the system',
    commandType: DmzCliCommandType.MUTATION,
    inputSchema: dmzCliMutationInputSchemas['create-user'].shape,
    outputSchema: dmzCliMutationOutputSchemas['create-user'].shape,
    requiredScopes: ['dmz_cli.mutation', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{email}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'update-user': {
    key: 'update-user',
    label: 'Update User',
    description: 'Updates an existing user in the system',
    commandType: DmzCliCommandType.MUTATION,
    inputSchema: dmzCliMutationInputSchemas['update-user'].shape,
    outputSchema: dmzCliMutationOutputSchemas['update-user'].shape,
    requiredScopes: ['dmz_cli.mutation', 'users:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}:{fields}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'delete-user': {
    key: 'delete-user',
    label: 'Delete User',
    description: 'Soft deletes a user in the system',
    commandType: DmzCliCommandType.MUTATION,
    inputSchema: dmzCliMutationInputSchemas['delete-user'].shape,
    outputSchema: dmzCliMutationOutputSchemas['delete-user'].shape,
    requiredScopes: ['dmz_cli.mutation', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'user:{userId}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'assign-training': {
    key: 'assign-training',
    label: 'Assign Training',
    description: 'Assigns a training program to a user',
    commandType: DmzCliCommandType.MUTATION,
    inputSchema: dmzCliMutationInputSchemas['assign-training'].shape,
    outputSchema: dmzCliMutationOutputSchemas['assign-training'].shape,
    requiredScopes: ['dmz_cli.mutation', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'assignment:{userId}:{trainingId}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'create-report': {
    key: 'create-report',
    label: 'Create Report',
    description: 'Generates a report based on specified criteria',
    commandType: DmzCliCommandType.MUTATION,
    inputSchema: dmzCliMutationInputSchemas['create-report'].shape,
    outputSchema: dmzCliMutationOutputSchemas['create-report'].shape,
    requiredScopes: ['dmz_cli.mutation', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'report:{reportType}:{tenantId}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'send-notification': {
    key: 'send-notification',
    label: 'Send Notification',
    description: 'Sends a notification to a user',
    commandType: DmzCliCommandType.MUTATION,
    inputSchema: dmzCliMutationInputSchemas['send-notification'].shape,
    outputSchema: dmzCliMutationOutputSchemas['send-notification'].shape,
    requiredScopes: ['dmz_cli.mutation', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'notification:{userId}:{timestamp}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
} as const;

export const m1DmzCliAdminContractManifest: Record<DmzCliAdminCommand, DmzCliAdminContract> = {
  'create-tenant': {
    key: 'create-tenant',
    label: 'Create Tenant',
    description: 'Creates a new tenant in the system',
    commandType: DmzCliCommandType.ADMIN,
    inputSchema: dmzCliAdminInputSchemas['create-tenant'].shape,
    outputSchema: dmzCliAdminOutputSchemas['create-tenant'].shape,
    requiredScopes: ['dmz_cli.admin', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'tenant:{name}',
    tenantBindingRequired: false,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'update-tenant': {
    key: 'update-tenant',
    label: 'Update Tenant',
    description: 'Updates an existing tenant',
    commandType: DmzCliCommandType.ADMIN,
    inputSchema: dmzCliAdminInputSchemas['update-tenant'].shape,
    outputSchema: dmzCliAdminOutputSchemas['update-tenant'].shape,
    requiredScopes: ['dmz_cli.admin', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'tenant:{tenantId}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'create-api-key': {
    key: 'create-api-key',
    label: 'Create API Key',
    description: 'Creates a new API key for tenant automation',
    commandType: DmzCliCommandType.ADMIN,
    inputSchema: dmzCliAdminInputSchemas['create-api-key'].shape,
    outputSchema: dmzCliAdminOutputSchemas['create-api-key'].shape,
    requiredScopes: ['dmz_cli.admin', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'apikey:{name}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'revoke-api-key': {
    key: 'revoke-api-key',
    label: 'Revoke API Key',
    description: 'Revokes an existing API key',
    commandType: DmzCliCommandType.ADMIN,
    inputSchema: dmzCliAdminInputSchemas['revoke-api-key'].shape,
    outputSchema: dmzCliAdminOutputSchemas['revoke-api-key'].shape,
    requiredScopes: ['dmz_cli.admin', 'admin:write'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'apikey:{keyId}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'list-api-keys': {
    key: 'list-api-keys',
    label: 'List API Keys',
    description: 'Lists API keys for a tenant',
    commandType: DmzCliCommandType.ADMIN,
    inputSchema: dmzCliAdminInputSchemas['list-api-keys'].shape,
    outputSchema: {},
    requiredScopes: ['dmz_cli.admin', 'admin:read'],
    idempotencySupported: false,
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
  'export-audit-log': {
    key: 'export-audit-log',
    label: 'Export Audit Log',
    description: 'Exports audit logs for a tenant',
    commandType: DmzCliCommandType.ADMIN,
    inputSchema: dmzCliAdminInputSchemas['export-audit-log'].shape,
    outputSchema: dmzCliAdminOutputSchemas['export-audit-log'].shape,
    requiredScopes: ['dmz_cli.admin', 'admin:read'],
    idempotencySupported: true,
    idempotencyKeyFormat: 'audit:{tenantId}:{startDate}',
    tenantBindingRequired: true,
    version: DMZ_CLI_VERSION,
    deprecated: false,
    outputFormat: 'json',
  },
} as const;

export const m1DmzCliIntegrationManifest: DmzCliIntegrationMetadata = {
  integrationVersion: DMZ_CLI_VERSION,
  compatibilityNotes: DMZ_CLI_COMPATIBILITY_NOTES,
  supportedCommandTypes: [
    DmzCliCommandType.QUERY,
    DmzCliCommandType.MUTATION,
    DmzCliCommandType.ADMIN,
  ],
  authRequirements: {
    oauthScopes: [],
    apiKeyScopes: ['integrations', 'dmz_cli.query', 'dmz_cli.mutation', 'dmz_cli.admin'],
    requiresTenantBinding: true,
  },
};

export const isValidDmzCliQueryCommand = (key: string): key is DmzCliQueryCommand => {
  return DMZ_CLI_QUERY_COMMANDS.includes(key as DmzCliQueryCommand);
};

export const isValidDmzCliMutationCommand = (key: string): key is DmzCliMutationCommand => {
  return DMZ_CLI_MUTATION_COMMANDS.includes(key as DmzCliMutationCommand);
};

export const isValidDmzCliAdminCommand = (key: string): key is DmzCliAdminCommand => {
  return DMZ_CLI_ADMIN_COMMANDS.includes(key as DmzCliAdminCommand);
};

export const getDmzCliQueryContract = (key: DmzCliQueryCommand): DmzCliQueryContract => {
  return m1DmzCliQueryContractManifest[key];
};

export const getDmzCliMutationContract = (key: DmzCliMutationCommand): DmzCliMutationContract => {
  return m1DmzCliMutationContractManifest[key];
};

export const getDmzCliAdminContract = (key: DmzCliAdminCommand): DmzCliAdminContract => {
  return m1DmzCliAdminContractManifest[key];
};

export const getAllDmzCliCommandContracts = (): DmzCliCommandContract[] => {
  return [
    ...Object.values(m1DmzCliQueryContractManifest),
    ...Object.values(m1DmzCliMutationContractManifest),
    ...Object.values(m1DmzCliAdminContractManifest),
  ];
};

export const validateDmzCliInput = (
  command: string,
  input: unknown,
): { valid: boolean; errors: z.ZodError | undefined } => {
  if (isValidDmzCliQueryCommand(command)) {
    const result = dmzCliQueryInputSchemas[command].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  if (isValidDmzCliMutationCommand(command)) {
    const result = dmzCliMutationInputSchemas[command].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  if (isValidDmzCliAdminCommand(command)) {
    const result = dmzCliAdminInputSchemas[command].safeParse(input);
    return { valid: result.success, errors: result.error };
  }
  return { valid: false, errors: undefined };
};

export interface BuildDmzCliErrorResponseParams {
  code: DmzCliErrorCode;
  message: string;
  commandType: DmzCliCommandType;
  command: string;
  tenantId: string;
  executionTimeMs?: number;
}

export const buildDmzCliErrorResponse = (
  params: BuildDmzCliErrorResponseParams,
): DmzCliCommandOutput => ({
  success: false,
  error: { code: params.code, message: params.message },
  metadata: {
    tenantId: params.tenantId,
    timestamp: new Date().toISOString(),
    commandType: params.commandType,
    command: params.command,
    executionTimeMs: params.executionTimeMs,
  },
});

export interface BuildDmzCliSuccessResponseParams {
  data: Record<string, unknown>;
  commandType: DmzCliCommandType;
  command: string;
  tenantId: string;
  idempotencyKey?: string;
  executionTimeMs?: number;
}

export const buildDmzCliSuccessResponse = (
  params: BuildDmzCliSuccessResponseParams,
): DmzCliCommandOutput => ({
  success: true,
  data: params.data,
  metadata: {
    idempotencyKey: params.idempotencyKey,
    tenantId: params.tenantId,
    timestamp: new Date().toISOString(),
    commandType: params.commandType,
    command: params.command,
    executionTimeMs: params.executionTimeMs,
  },
});
