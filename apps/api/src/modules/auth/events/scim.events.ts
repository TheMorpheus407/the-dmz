export const SCIM_EVENTS = {
  SCIM_USER_PROVISIONED: 'auth.scim.user.provisioned',
  SCIM_USER_UPDATED: 'auth.scim.user.updated',
  SCIM_USER_DEPROVISIONED: 'auth.scim.user.deprovisioned',
  SCIM_USER_REACTIVATED: 'auth.scim.user.reactivated',
  SCIM_GROUP_PROVISIONED: 'auth.scim.group.provisioned',
  SCIM_GROUP_UPDATED: 'auth.scim.group.updated',
  SCIM_GROUP_DELETED: 'auth.scim.group.deleted',
  SCIM_GROUP_MEMBERSHIP_CHANGED: 'auth.scim.group.membership_changed',
  SCIM_JIT_RECONCILIATION: 'auth.scim.jit.reconciliation',
} as const;

export type ScimEventType = (typeof SCIM_EVENTS)[keyof typeof SCIM_EVENTS];

export interface SCIMUserProvisionedPayload {
  userId: string;
  email: string;
  tenantId: string;
  lifecycleOutcome: string;
  idempotencyKey: string;
  externalId?: string;
}

export interface SCIMUserUpdatedPayload {
  userId: string;
  email: string;
  tenantId: string;
  changes: string[];
  lifecycleOutcome: string;
}

export interface SCIMUserDeprovisionedPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: 'deactivate' | 'delete';
  sessionsRevoked: number;
}

export interface SCIMUserReactivatedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export interface SCIMGroupProvisionedPayload {
  groupId: string;
  name: string;
  tenantId: string;
  lifecycleOutcome: string;
}

export interface SCIMGroupUpdatedPayload {
  groupId: string;
  name: string;
  tenantId: string;
  changes: string[];
}

export interface SCIMGroupDeletedPayload {
  groupId: string;
  name: string;
  tenantId: string;
}

export interface SCIMGroupMembershipChangedPayload {
  groupId: string;
  groupName: string;
  tenantId: string;
  userIdsAdded: string[];
  userIdsRemoved: string[];
}

export interface SCIMJitReconciliationPayload {
  tenantId: string;
  scimUserId?: string;
  jitUserId: string;
  email: string;
  outcome: string;
  reason: string;
}
