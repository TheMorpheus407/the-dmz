export const SESSION_EVENTS = {
  SESSION_CREATED: 'auth.session.created',
  SESSION_REVOKED: 'auth.session.revoked',
  SESSION_REVOKED_FEDERATED: 'auth.session.revoked.federated',
  SESSION_REVOCATION_FAILED: 'auth.session.revocation.failed',
  SESSION_REVOCATION_IGNORED: 'auth.session.revocation.ignored',
  SESSION_REVOKED_ADMIN: 'auth.session.revoked.admin',
  SESSION_REVOKED_USER_ALL: 'auth.session.revoked.user_all',
  SESSION_REVOKED_TENANT_ALL: 'auth.session.revoked.tenant_all',
  SESSION_REVOCATION_DENIED: 'auth.session.revocation.denied',
} as const;

export type SessionEventType = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS];

export interface AuthSessionCreatedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
}

export interface AuthSessionRevokedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  reason: 'logout' | 'expired' | 'revoked' | 'refresh_rotation';
}

export interface AuthSessionRevokedFederatedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  reason: 'saml_logout' | 'oidc_logout' | 'scim_deprovision' | 'admin_revocation';
  sourceType: 'saml' | 'oidc' | 'scim';
  ssoProviderId?: string;
  correlationId: string;
  sessionsRevoked: number;
}

export interface AuthSessionRevocationFailedPayload {
  tenantId: string;
  userId?: string;
  reason: string;
  errorCode: string;
  sourceType: 'saml' | 'oidc' | 'scim';
  correlationId: string;
}

export interface AuthSessionRevocationIgnoredPayload {
  tenantId: string;
  userId?: string;
  reason: string;
  sourceType: 'saml' | 'oidc' | 'scim';
  correlationId: string;
}

export interface AuthSessionRevokedAdminPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  reason: 'admin_revoked';
  initiatedBy: string;
  correlationId: string;
}

export interface AuthSessionRevokedUserAllPayload {
  userId: string;
  tenantId: string;
  sessionsRevoked: number;
  reason: 'admin_revoked';
  initiatedBy: string;
  correlationId: string;
}

export interface AuthSessionRevokedTenantAllPayload {
  tenantId: string;
  sessionsRevoked: number;
  reason: 'tenant_wide_admin_revocation';
  initiatedBy: string;
  correlationId: string;
}

export interface AuthSessionRevocationDeniedPayload {
  sessionId?: string;
  userId?: string;
  tenantId: string;
  reason: string;
  initiatedBy: string;
  correlationId: string;
}
