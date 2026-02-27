import { z } from 'zod';

export const SCIMLifecycleOutcome = {
  CREATED: 'created',
  UPDATED: 'updated',
  DEACTIVATED: 'deactivated',
  REACTIVATED: 'reactivated',
  SOFT_DELETED: 'soft_deleted',
} as const;

export type SCIMLifecycleOutcome = (typeof SCIMLifecycleOutcome)[keyof typeof SCIMLifecycleOutcome];

export const scimLifecycleOutcomeSchema = z.enum([
  SCIMLifecycleOutcome.CREATED,
  SCIMLifecycleOutcome.UPDATED,
  SCIMLifecycleOutcome.DEACTIVATED,
  SCIMLifecycleOutcome.REACTIVATED,
  SCIMLifecycleOutcome.SOFT_DELETED,
]);

export const SCIMGroupLifecycleOutcome = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  MEMBERSHIP_CHANGED: 'membership_changed',
} as const;

export type SCIMGroupLifecycleOutcome =
  (typeof SCIMGroupLifecycleOutcome)[keyof typeof SCIMGroupLifecycleOutcome];

export const scimGroupLifecycleOutcomeSchema = z.enum([
  SCIMGroupLifecycleOutcome.CREATED,
  SCIMGroupLifecycleOutcome.UPDATED,
  SCIMGroupLifecycleOutcome.DELETED,
  SCIMGroupLifecycleOutcome.MEMBERSHIP_CHANGED,
]);

export const SCIMConflictOutcome = {
  NONE: 'none',
  FIELD_OVERWRITTEN: 'field_overwritten',
  DUPLICATE_PREVENTED: 'duplicate_prevented',
  MERGED: 'merged',
  SCIM_WINS: 'scim_wins',
  JIT_WINS: 'jit_wins',
} as const;

export type SCIMConflictOutcome = (typeof SCIMConflictOutcome)[keyof typeof SCIMConflictOutcome];

export const scimConflictOutcomeSchema = z.enum([
  SCIMConflictOutcome.NONE,
  SCIMConflictOutcome.FIELD_OVERWRITTEN,
  SCIMConflictOutcome.DUPLICATE_PREVENTED,
  SCIMConflictOutcome.MERGED,
  SCIMConflictOutcome.SCIM_WINS,
  SCIMConflictOutcome.JIT_WINS,
]);

export const SCIMAttributeMutability = {
  READ_ONLY: 'readOnly',
  READ_WRITE: 'readWrite',
  WRITE_ONLY: 'writeOnly',
  IMMUTABLE: 'immutable',
} as const;

export type SCIMAttributeMutability =
  (typeof SCIMAttributeMutability)[keyof typeof SCIMAttributeMutability];

export const scimAttributeMutabilitySchema = z.enum([
  SCIMAttributeMutability.READ_ONLY,
  SCIMAttributeMutability.READ_WRITE,
  SCIMAttributeMutability.WRITE_ONLY,
  SCIMAttributeMutability.IMMUTABLE,
]);

export const SCIMConflictResolutionPolicy = {
  SCIM_PRIORITY: 'scim_priority',
  JIT_PRIORITY: 'jit_priority',
  ADMIN_FIELDS_PROTECTED: 'admin_fields_protected',
  MERGE_VALUES: 'merge_values',
} as const;

export type SCIMConflictResolutionPolicy =
  (typeof SCIMConflictResolutionPolicy)[keyof typeof SCIMConflictResolutionPolicy];

export const scimConflictResolutionPolicySchema = z.enum([
  SCIMConflictResolutionPolicy.SCIM_PRIORITY,
  SCIMConflictResolutionPolicy.JIT_PRIORITY,
  SCIMConflictResolutionPolicy.ADMIN_FIELDS_PROTECTED,
  SCIMConflictResolutionPolicy.MERGE_VALUES,
]);

export const SCIMIdentityKeyType = {
  EMAIL: 'email',
  SUBJECT: 'subject',
  EXTERNAL_ID: 'external_id',
} as const;

export type SCIMIdentityKeyType = (typeof SCIMIdentityKeyType)[keyof typeof SCIMIdentityKeyType];

export const scimIdentityKeyTypeSchema = z.enum([
  SCIMIdentityKeyType.EMAIL,
  SCIMIdentityKeyType.SUBJECT,
  SCIMIdentityKeyType.EXTERNAL_ID,
]);

export const scimIdentityKeySchema = z.object({
  type: scimIdentityKeyTypeSchema,
  value: z.string().min(1),
});

export type SCIMIdentityKey = z.infer<typeof scimIdentityKeySchema>;

export const scimAttributeMappingSchema = z.object({
  scimAttribute: z.string().min(1),
  platformAttribute: z.string().min(1),
  mutability: scimAttributeMutabilitySchema,
  isCore: z.boolean(),
});

export type SCIMAttributeMapping = z.infer<typeof scimAttributeMappingSchema>;

export const SCIM_CORE_ATTRIBUTES: SCIMAttributeMapping[] = [
  { scimAttribute: 'userName', platformAttribute: 'email', mutability: 'immutable', isCore: true },
  {
    scimAttribute: 'displayName',
    platformAttribute: 'displayName',
    mutability: 'readWrite',
    isCore: true,
  },
  {
    scimAttribute: 'name.formatted',
    platformAttribute: 'displayName',
    mutability: 'readWrite',
    isCore: true,
  },
  {
    scimAttribute: 'name.givenName',
    platformAttribute: 'firstName',
    mutability: 'readWrite',
    isCore: true,
  },
  {
    scimAttribute: 'name.familyName',
    platformAttribute: 'lastName',
    mutability: 'readWrite',
    isCore: true,
  },
  { scimAttribute: 'emails', platformAttribute: 'emails', mutability: 'readWrite', isCore: true },
  {
    scimAttribute: 'department',
    platformAttribute: 'department',
    mutability: 'readWrite',
    isCore: true,
  },
  { scimAttribute: 'title', platformAttribute: 'title', mutability: 'readWrite', isCore: true },
  {
    scimAttribute: 'manager',
    platformAttribute: 'managerId',
    mutability: 'readWrite',
    isCore: true,
  },
  { scimAttribute: 'active', platformAttribute: 'isActive', mutability: 'readWrite', isCore: true },
  { scimAttribute: 'groups', platformAttribute: 'groups', mutability: 'readOnly', isCore: true },
];

export const SCIM_ADMIN_PROTECTED_FIELDS = ['role', 'tenantId', 'createdAt', 'updatedAt'] as const;

export type SCIMAdminProtectedField = (typeof SCIM_ADMIN_PROTECTED_FIELDS)[number];

export const scimAdminProtectedFieldsSchema = z.enum(SCIM_ADMIN_PROTECTED_FIELDS);

export const scimGroupRoleMappingSchema = z.object({
  scimGroupId: z.string().min(1),
  platformRoleId: z.string().min(1),
  isAllowed: z.boolean(),
});

export type SCIMGroupRoleMapping = z.infer<typeof scimGroupRoleMappingSchema>;

export const SCIMLifecycleContractSchema = z.object({
  version: z.string(),
  supportedAttributes: z.array(scimAttributeMappingSchema),
  adminProtectedFields: z.array(scimAdminProtectedFieldsSchema),
  conflictResolutionPolicy: scimConflictResolutionPolicySchema,
  identityKeyType: scimIdentityKeyTypeSchema,
  groupRoleMappings: z.array(scimGroupRoleMappingSchema),
  allowGroupRoleAssignment: z.boolean(),
  softDeleteOnDeprovision: z.boolean(),
  syncLatencyTargetMs: z.number().int().positive(),
});

export type SCIMLifecycleContract = z.infer<typeof SCIMLifecycleContractSchema>;

export const SCIM_LIFECYCLE_CONTRACT_V1: SCIMLifecycleContract = {
  version: '1.0.0',
  supportedAttributes: SCIM_CORE_ATTRIBUTES,
  adminProtectedFields: [...SCIM_ADMIN_PROTECTED_FIELDS],
  conflictResolutionPolicy: SCIMConflictResolutionPolicy.SCIM_PRIORITY,
  identityKeyType: SCIMIdentityKeyType.EMAIL,
  groupRoleMappings: [],
  allowGroupRoleAssignment: false,
  softDeleteOnDeprovision: true,
  syncLatencyTargetMs: 60000,
};

export const scimReconciliationResultSchema = z.object({
  outcome: scimConflictOutcomeSchema,
  userId: z.string().uuid(),
  changesApplied: z.array(z.string()),
  reason: z.string(),
});

export type SCIMReconciliationResult = z.infer<typeof scimReconciliationResultSchema>;

export const scimProvisioningResultSchema = z.object({
  lifecycleOutcome: scimLifecycleOutcomeSchema,
  userId: z.string().uuid(),
  externalId: z.string().optional(),
  idempotencyKey: z.string().min(1),
  correlationId: z.string().uuid(),
});

export type SCIMProvisioningResult = z.infer<typeof scimProvisioningResultSchema>;

export const scimGroupProvisioningResultSchema = z.object({
  lifecycleOutcome: scimGroupLifecycleOutcomeSchema,
  groupId: z.string().uuid(),
  externalId: z.string().optional(),
  idempotencyKey: z.string().min(1),
  correlationId: z.string().uuid(),
});

export type SCIMGroupProvisioningResult = z.infer<typeof scimGroupProvisioningResultSchema>;
