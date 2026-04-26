export const DELEGATION_EVENTS = {
  DELEGATION_ROLE_CREATED: 'auth.delegation.role.created',
  DELEGATION_ROLE_UPDATED: 'auth.delegation.role.updated',
  DELEGATION_ROLE_ASSIGNED: 'auth.delegation.role.assigned',
  DELEGATION_DENIED: 'auth.delegation.denied',
} as const;

export type DelegationEventType = (typeof DELEGATION_EVENTS)[keyof typeof DELEGATION_EVENTS];

export interface AuthDelegationRoleCreatedPayload {
  actorId: string;
  tenantId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  correlationId: string;
}

export interface AuthDelegationRoleUpdatedPayload {
  actorId: string;
  tenantId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  correlationId: string;
}

export interface AuthDelegationRoleAssignedPayload {
  actorId: string;
  tenantId: string;
  targetUserId: string;
  roleId: string;
  roleName: string;
  scope: string | null;
  expiresAt: string | null;
  correlationId: string;
}

export interface AuthDelegationDeniedPayload {
  actorId: string;
  tenantId: string;
  targetUserId?: string;
  roleId?: string;
  roleName?: string;
  permissions?: string[];
  reason: string;
  outcome: string;
  correlationId: string;
}
