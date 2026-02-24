import type { DomainEvent } from '../../shared/events/event-types.js';

export const AUTHZ_EVENTS = {
  ROLE_CREATED: 'authz.role.created',
  ROLE_UPDATED: 'authz.role.updated',
  ROLE_DELETED: 'authz.role.deleted',
  ROLE_ASSIGNED: 'authz.role.assigned',
  ROLE_REVOKED: 'authz.role.revoked',
  PERMISSION_CREATED: 'authz.permission.created',
  PERMISSION_UPDATED: 'authz.permission.updated',
  PERMISSION_DELETED: 'authz.permission.deleted',
  ROLE_PERMISSION_GRANTED: 'authz.role.permission.granted',
  ROLE_PERMISSION_REVOKED: 'authz.role.permission.revoked',
  POLICY_CREATED: 'authz.policy.created',
  POLICY_UPDATED: 'authz.policy.updated',
  POLICY_DELETED: 'authz.policy.deleted',
  TENANT_ATTRIBUTE_CHANGED: 'authz.tenant.attribute.changed',
} as const;

export type AuthzEventType = (typeof AUTHZ_EVENTS)[keyof typeof AUTHZ_EVENTS];

export interface AuthzRoleCreatedPayload {
  roleId: string;
  roleName: string;
  tenantId: string;
}

export interface AuthzRoleUpdatedPayload {
  roleId: string;
  roleName: string;
  tenantId: string;
  changes: Array<keyof AuthzRoleUpdatedPayload>;
}

export interface AuthzRoleDeletedPayload {
  roleId: string;
  roleName: string;
  tenantId: string;
}

export interface AuthzRoleAssignedPayload {
  roleId: string;
  roleName: string;
  userId: string;
  tenantId: string;
}

export interface AuthzRoleRevokedPayload {
  roleId: string;
  roleName: string;
  userId: string;
  tenantId: string;
}

export interface AuthzPermissionCreatedPayload {
  permissionId: string;
  resource: string;
  action: string;
}

export interface AuthzPermissionUpdatedPayload {
  permissionId: string;
  resource: string;
  action: string;
  changes: Array<keyof AuthzPermissionUpdatedPayload>;
}

export interface AuthzPermissionDeletedPayload {
  permissionId: string;
  resource: string;
  action: string;
}

export interface AuthzRolePermissionGrantedPayload {
  roleId: string;
  permissionId: string;
  tenantId: string;
}

export interface AuthzRolePermissionRevokedPayload {
  roleId: string;
  permissionId: string;
  tenantId: string;
}

export interface AuthzPolicyCreatedPayload {
  policyId: string;
  policyName: string;
  tenantId: string;
}

export interface AuthzPolicyUpdatedPayload {
  policyId: string;
  policyName: string;
  tenantId: string;
  changes: string[];
}

export interface AuthzPolicyDeletedPayload {
  policyId: string;
  policyName: string;
  tenantId: string;
}

export interface AuthzTenantAttributeChangedPayload {
  tenantId: string;
  attributeName: string;
  oldValue: string | null;
  newValue: string | null;
}

export type AuthzEventPayloadMap = {
  [AUTHZ_EVENTS.ROLE_CREATED]: AuthzRoleCreatedPayload;
  [AUTHZ_EVENTS.ROLE_UPDATED]: AuthzRoleUpdatedPayload;
  [AUTHZ_EVENTS.ROLE_DELETED]: AuthzRoleDeletedPayload;
  [AUTHZ_EVENTS.ROLE_ASSIGNED]: AuthzRoleAssignedPayload;
  [AUTHZ_EVENTS.ROLE_REVOKED]: AuthzRoleRevokedPayload;
  [AUTHZ_EVENTS.PERMISSION_CREATED]: AuthzPermissionCreatedPayload;
  [AUTHZ_EVENTS.PERMISSION_UPDATED]: AuthzPermissionUpdatedPayload;
  [AUTHZ_EVENTS.PERMISSION_DELETED]: AuthzPermissionDeletedPayload;
  [AUTHZ_EVENTS.ROLE_PERMISSION_GRANTED]: AuthzRolePermissionGrantedPayload;
  [AUTHZ_EVENTS.ROLE_PERMISSION_REVOKED]: AuthzRolePermissionRevokedPayload;
  [AUTHZ_EVENTS.POLICY_CREATED]: AuthzPolicyCreatedPayload;
  [AUTHZ_EVENTS.POLICY_UPDATED]: AuthzPolicyUpdatedPayload;
  [AUTHZ_EVENTS.POLICY_DELETED]: AuthzPolicyDeletedPayload;
  [AUTHZ_EVENTS.TENANT_ATTRIBUTE_CHANGED]: AuthzTenantAttributeChangedPayload;
};

export type AuthzDomainEvent<T extends AuthzEventType = AuthzEventType> = DomainEvent<
  AuthzEventPayloadMap[T]
>;

interface BaseAuthzEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
}

export const createAuthzRoleCreatedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzRoleCreatedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.ROLE_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.ROLE_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzRoleUpdatedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzRoleUpdatedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.ROLE_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.ROLE_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzRoleDeletedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzRoleDeletedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.ROLE_DELETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.ROLE_DELETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzRoleAssignedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzRoleAssignedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.ROLE_ASSIGNED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.ROLE_ASSIGNED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzRoleRevokedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzRoleRevokedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.ROLE_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.ROLE_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzPermissionCreatedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzPermissionCreatedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.PERMISSION_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.PERMISSION_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzPermissionUpdatedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzPermissionUpdatedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.PERMISSION_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.PERMISSION_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzPermissionDeletedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzPermissionDeletedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.PERMISSION_DELETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.PERMISSION_DELETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzRolePermissionGrantedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzRolePermissionGrantedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.ROLE_PERMISSION_GRANTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.ROLE_PERMISSION_GRANTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzRolePermissionRevokedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzRolePermissionRevokedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.ROLE_PERMISSION_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.ROLE_PERMISSION_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzPolicyCreatedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzPolicyCreatedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.POLICY_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.POLICY_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzPolicyUpdatedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzPolicyUpdatedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.POLICY_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.POLICY_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzPolicyDeletedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzPolicyDeletedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.POLICY_DELETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.POLICY_DELETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthzTenantAttributeChangedEvent = (
  params: BaseAuthzEventParams & { payload: AuthzTenantAttributeChangedPayload },
): AuthzDomainEvent<typeof AUTHZ_EVENTS.TENANT_ATTRIBUTE_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTHZ_EVENTS.TENANT_ATTRIBUTE_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const AUTHZ_INVALIDATION_EVENTS = [
  AUTHZ_EVENTS.ROLE_CREATED,
  AUTHZ_EVENTS.ROLE_UPDATED,
  AUTHZ_EVENTS.ROLE_DELETED,
  AUTHZ_EVENTS.ROLE_ASSIGNED,
  AUTHZ_EVENTS.ROLE_REVOKED,
  AUTHZ_EVENTS.PERMISSION_CREATED,
  AUTHZ_EVENTS.PERMISSION_UPDATED,
  AUTHZ_EVENTS.PERMISSION_DELETED,
  AUTHZ_EVENTS.ROLE_PERMISSION_GRANTED,
  AUTHZ_EVENTS.ROLE_PERMISSION_REVOKED,
  AUTHZ_EVENTS.POLICY_CREATED,
  AUTHZ_EVENTS.POLICY_UPDATED,
  AUTHZ_EVENTS.POLICY_DELETED,
  AUTHZ_EVENTS.TENANT_ATTRIBUTE_CHANGED,
] as const;
