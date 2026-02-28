import { z } from 'zod';

export const GrantDecisionOutcome = {
  ALLOWED: 'allowed',
  DENIED_PERMISSION_CEILING: 'denied_permission_ceiling',
  DENIED_ROLE_NOT_ASSIGNABLE: 'denied_role_not_assignable',
  DENIED_SYSTEM_ROLE_MUTATION: 'denied_system_role_mutation',
  DENIED_STEP_UP_REQUIRED: 'denied_step_up_required',
  DENIED_SELF_ESCALATION: 'denied_self_escalation',
  DENIED_TENANT_ISOLATION: 'denied_tenant_isolation',
  DENIED_EXPIRED: 'denied_expired',
  DENIED_SCOPE_MISMATCH: 'denied_scope_mismatch',
} as const;

export type GrantDecisionOutcome = (typeof GrantDecisionOutcome)[keyof typeof GrantDecisionOutcome];

export const grantDecisionOutcomeSchema = z.enum([
  GrantDecisionOutcome.ALLOWED,
  GrantDecisionOutcome.DENIED_PERMISSION_CEILING,
  GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE,
  GrantDecisionOutcome.DENIED_SYSTEM_ROLE_MUTATION,
  GrantDecisionOutcome.DENIED_STEP_UP_REQUIRED,
  GrantDecisionOutcome.DENIED_SELF_ESCALATION,
  GrantDecisionOutcome.DENIED_TENANT_ISOLATION,
  GrantDecisionOutcome.DENIED_EXPIRED,
  GrantDecisionOutcome.DENIED_SCOPE_MISMATCH,
]);

export interface PermissionCeilingInput {
  actorId: string;
  actorTenantId: string;
  targetPermissions: string[];
  targetRoleId?: string;
  targetUserId?: string;
}

export interface PermissionCeilingOutput {
  outcome: GrantDecisionOutcome;
  allowedPermissions: string[];
  deniedPermissions: string[];
  reason?: string;
  stepUpRequired?: boolean;
}

export interface RoleGrantInput {
  actorId: string;
  actorTenantId: string;
  targetUserId: string;
  targetRoleId: string;
  scope?: string | null;
  expiresAt?: Date | null;
}

export interface RoleGrantOutput {
  outcome: GrantDecisionOutcome;
  reason?: string;
  stepUpRequired?: boolean;
  requiresMfa?: boolean;
}

export interface RoleCreateInput {
  actorId: string;
  actorTenantId: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface RoleCreateOutput {
  outcome: GrantDecisionOutcome;
  roleId?: string;
  reason?: string;
}

export interface RoleUpdateInput {
  actorId: string;
  actorTenantId: string;
  roleId: string;
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleUpdateOutput {
  outcome: GrantDecisionOutcome;
  reason?: string;
}

export const permissionCeilingInputSchema = z.object({
  actorId: z.string().uuid(),
  actorTenantId: z.string().uuid(),
  targetPermissions: z.array(z.string()),
  targetRoleId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
});

export const roleGrantInputSchema = z.object({
  actorId: z.string().uuid(),
  actorTenantId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  targetRoleId: z.string().uuid(),
  scope: z.string().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
});

export const roleCreateInputSchema = z.object({
  actorId: z.string().uuid(),
  actorTenantId: z.string().uuid(),
  name: z.string().min(1).max(64),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

export const roleUpdateInputSchema = z.object({
  actorId: z.string().uuid(),
  actorTenantId: z.string().uuid(),
  roleId: z.string().uuid(),
  name: z.string().min(1).max(64).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});
