import type { DomainEvent } from '../../shared/events/event-types.js';

export const AUTH_EVENTS = {
  USER_CREATED: 'auth.user.created',
  USER_UPDATED: 'auth.user.updated',
  USER_DEACTIVATED: 'auth.user.deactivated',
  SESSION_CREATED: 'auth.session.created',
  SESSION_REVOKED: 'auth.session.revoked',
  LOGIN_FAILED: 'auth.login.failed',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset.completed',
  PASSWORD_RESET_FAILED: 'auth.password_reset.failed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  ACCOUNT_UNLOCKED: 'auth.account_unlocked',
  NEW_DEVICE_SESSION: 'auth.new_device_session',
  MFA_ENABLED: 'auth.mfa_enabled',
  MFA_DISABLED: 'auth.mfa_disabled',
  MFA_RECOVERY_CODES_USED: 'auth.mfa_recovery_codes_used',
  JWT_SIGNING_KEY_CREATED: 'jwt.' + 'signing_key.created',
  JWT_SIGNING_KEY_ROTATED: 'jwt.' + 'signing_key.rotated',
  JWT_SIGNING_KEY_REVOKED: 'jwt.' + 'signing_key.revoked',
  OAUTH_CLIENT_CREATED: 'auth.oauth_client.created',
  OAUTH_CLIENT_ROTATED: 'auth.oauth_client.rotated',
  OAUTH_CLIENT_REVOKED: 'auth.oauth_client.revoked',
  OAUTH_TOKEN_ISSUED: 'auth.oauth_token.issued',
  OAUTH_TOKEN_REVOKED: 'auth.oauth_token.revoked',
  OAUTH_SCOPE_DENIED: 'auth.oauth_scope_denied',
  SSO_LOGIN_INITIATED: 'auth.sso.login.initiated',
  SSO_LOGIN_SUCCESS: 'auth.sso.login.success',
  SSO_LOGIN_FAILED: 'auth.sso.login.failed',
  SSO_ASSERTION_VALIDATED: 'auth.sso.assertion.validated',
  SSO_ASSERTION_FAILED: 'auth.sso.assertion.failed',
  SSO_TOKEN_EXCHANGED: 'auth.sso.token.exchanged',
  SSO_ACCOUNT_LINKED: 'auth.sso.account.linked',
  SSO_ACCOUNT_LINKING_FAILED: 'auth.sso.account.linking_failed',
  SSO_JIT_PROVISIONED: 'auth.sso.jit.provisioned',
  SSO_JIT_DENIED: 'auth.sso.jit.denied',
  SSO_METADATA_REFRESHED: 'auth.sso.metadata.refreshed',
  SSO_METADATA_FAILED: 'auth.sso.metadata.failed',
  SCIM_USER_PROVISIONED: 'auth.scim.user.provisioned',
  SCIM_USER_UPDATED: 'auth.scim.user.updated',
  SCIM_USER_DEPROVISIONED: 'auth.scim.user.deprovisioned',
  SCIM_USER_REACTIVATED: 'auth.scim.user.reactivated',
  SCIM_GROUP_PROVISIONED: 'auth.scim.group.provisioned',
  SCIM_GROUP_UPDATED: 'auth.scim.group.updated',
  SCIM_GROUP_DELETED: 'auth.scim.group.deleted',
  SCIM_GROUP_MEMBERSHIP_CHANGED: 'auth.scim.group.membership_changed',
  SCIM_JIT_RECONCILIATION: 'auth.scim.jit.reconciliation',
  SSO_VALIDATION_STARTED: 'auth.sso.validation.started',
  SSO_VALIDATION_COMPLETED: 'auth.sso.validation.completed',
  SSO_VALIDATION_FAILED: 'auth.sso.validation.failed',
  SSO_ACTIVATION_SUCCEEDED: 'auth.sso.activation.succeeded',
  SSO_ACTIVATION_FAILED: 'auth.sso.activation.failed',
  SSO_DEACTIVATION_SUCCEEDED: 'auth.sso.deactivation.succeeded',
  SSO_LOGOUT_INITIATED: 'auth.sso.logout.initiated',
  SSO_LOGOUT_PROCESSED: 'auth.sso.logout.processed',
  SSO_LOGOUT_FAILED: 'auth.sso.logout.failed',
  SESSION_REVOKED_FEDERATED: 'auth.session.revoked.federated',
  SESSION_REVOCATION_FAILED: 'auth.session.revocation.failed',
  SESSION_REVOCATION_IGNORED: 'auth.session.revocation.ignored',
} as const;

export type AuthEventType = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

export interface AuthUserCreatedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export interface AuthUserUpdatedPayload {
  userId: string;
  email: string;
  tenantId: string;
  changes: Array<keyof AuthUserUpdatedPayload>;
}

export interface AuthUserDeactivatedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

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

export interface AuthLoginFailedPayload {
  tenantId: string;
  email: string;
  reason: 'invalid_credentials' | 'user_inactive' | 'account_locked';
  correlationId: string;
}

export interface AuthPasswordResetRequestedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export interface AuthPasswordResetCompletedPayload {
  userId: string;
  email: string;
  tenantId: string;
  sessionsRevoked: number;
}

export interface AuthPasswordResetFailedPayload {
  tenantId: string;
  email: string;
  reason: 'expired' | 'invalid' | 'already_used' | 'policy_denied' | 'rate_limited';
  correlationId: string;
}

export interface AuthAccountLockedPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: string;
  riskContext?: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    location?: string;
    isAnomalous?: boolean;
  };
}

export interface AuthAccountUnlockedPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: string;
}

export interface AuthNewDeviceSessionPayload {
  sessionId: string;
  userId: string;
  email: string;
  tenantId: string;
  riskContext: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    location?: string;
    isNewDevice: boolean;
    isAnomalous?: boolean;
  };
}

export interface AuthMfaEnabledPayload {
  userId: string;
  email: string;
  tenantId: string;
  method: 'totp' | 'webauthn' | 'email';
}

export interface AuthMfaDisabledPayload {
  userId: string;
  email: string;
  tenantId: string;
  reason: 'user_request' | 'admin_reset' | 'compromised';
}

export interface AuthMfaRecoveryCodesUsedPayload {
  userId: string;
  email: string;
  tenantId: string;
  riskContext?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
}

export interface JWTSigningKeyCreatedPayload {
  kid: string;
  keyType: string;
  algorithm: string;
}

export interface JWTSigningKeyRotatedPayload {
  oldKid: string;
  newKid: string;
}

export interface JWTSigningKeyRevokedPayload {
  kid: string;
  reason: string;
}

export interface OAuthClientCreatedPayload {
  clientId: string;
  name: string;
  tenantId: string;
  scopes: string[];
}

export interface OAuthClientRotatedPayload {
  clientId: string;
  name: string;
  tenantId: string;
}

export interface OAuthClientRevokedPayload {
  clientId: string;
  name: string;
  tenantId: string;
  reason: string;
}

export interface OAuthTokenIssuedPayload {
  clientId: string;
  tenantId: string;
  scopes: string[];
}

export interface OAuthScopeDeniedPayload {
  clientId: string;
  tenantId: string;
  requestedScope: string;
  requiredScope: string;
}

export interface SSOLoginInitiatedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  redirectUri?: string;
}

export interface SSOLoginSuccessPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  userId: string;
  email: string;
  subject: string;
  linkingOutcome: string;
}

export interface SSOLoginFailedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  reason: string;
  failureCode: string;
  correlationId: string;
}

export interface SSOAssertionValidatedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  subject: string;
  valid: boolean;
  failureReason?: string;
}

export interface SSOAssertionFailedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  failureCode: string;
  failureReason: string;
  correlationId: string;
}

export interface SSOTokenExchangedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  userId: string;
  subject: string;
}

export interface SSOAccountLinkedPayload {
  tenantId: string;
  ssoProviderId: string;
  userId: string;
  subject: string;
  linkingOutcome: string;
}

export interface SSOAccountLinkingFailedPayload {
  tenantId: string;
  ssoProviderId: string;
  subject: string;
  email?: string;
  reason: string;
  failureCode: string;
  correlationId: string;
}

export interface SSOJitProvisionedPayload {
  tenantId: string;
  ssoProviderId: string;
  userId: string;
  email: string;
  role: string;
}

export interface SSOJitDeniedPayload {
  tenantId: string;
  ssoProviderId: string;
  subject: string;
  email?: string;
  reason: string;
}

export interface SSOMetadataRefreshedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
}

export interface SSOMetadataFailedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  reason: string;
  correlationId: string;
}

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

export interface SSOValidationStartedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc' | 'scim';
  correlationId: string;
  executedBy?: string;
}

export interface SSOValidationCompletedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc' | 'scim';
  validationId: string;
  overallStatus: 'ok' | 'warning' | 'failed';
  checksPassed: number;
  checksFailed: number;
  checksWarning: number;
  correlationId: string;
}

export interface SSOValidationFailedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc' | 'scim';
  correlationId: string;
  reason: string;
  errorCode: string;
}

export interface SSOActivationSucceededPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  enforceSSOOnly: boolean;
  activatedBy: string;
  previousValidationId?: string;
}

export interface SSOActivationFailedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  reason: string;
  errorCode: string;
  correlationId: string;
}

export interface SSODeactivationSucceededPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  deactivatedBy: string;
}

export interface SSOLogoutInitiatedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  logoutType: 'back_channel' | 'front_channel' | 'idp_initiated' | 'sp_initiated';
  correlationId: string;
  userId?: string;
}

export interface SSOLogoutProcessedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  userId: string;
  sessionsRevoked: number;
  result: 'revoked' | 'already_revoked' | 'failed';
  correlationId: string;
}

export interface SSOLogoutFailedPayload {
  tenantId: string;
  ssoProviderId: string;
  providerType: 'saml' | 'oidc';
  reason: string;
  errorCode: string;
  correlationId: string;
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

export type AuthEventPayloadMap = {
  [AUTH_EVENTS.USER_CREATED]: AuthUserCreatedPayload;
  [AUTH_EVENTS.USER_UPDATED]: AuthUserUpdatedPayload;
  [AUTH_EVENTS.USER_DEACTIVATED]: AuthUserDeactivatedPayload;
  [AUTH_EVENTS.SESSION_CREATED]: AuthSessionCreatedPayload;
  [AUTH_EVENTS.SESSION_REVOKED]: AuthSessionRevokedPayload;
  [AUTH_EVENTS.LOGIN_FAILED]: AuthLoginFailedPayload;
  [AUTH_EVENTS.PASSWORD_RESET_REQUESTED]: AuthPasswordResetRequestedPayload;
  [AUTH_EVENTS.PASSWORD_RESET_COMPLETED]: AuthPasswordResetCompletedPayload;
  [AUTH_EVENTS.PASSWORD_RESET_FAILED]: AuthPasswordResetFailedPayload;
  [AUTH_EVENTS.ACCOUNT_LOCKED]: AuthAccountLockedPayload;
  [AUTH_EVENTS.ACCOUNT_UNLOCKED]: AuthAccountUnlockedPayload;
  [AUTH_EVENTS.NEW_DEVICE_SESSION]: AuthNewDeviceSessionPayload;
  [AUTH_EVENTS.MFA_ENABLED]: AuthMfaEnabledPayload;
  [AUTH_EVENTS.MFA_DISABLED]: AuthMfaDisabledPayload;
  [AUTH_EVENTS.MFA_RECOVERY_CODES_USED]: AuthMfaRecoveryCodesUsedPayload;
  [AUTH_EVENTS.JWT_SIGNING_KEY_CREATED]: JWTSigningKeyCreatedPayload;
  [AUTH_EVENTS.JWT_SIGNING_KEY_ROTATED]: JWTSigningKeyRotatedPayload;
  [AUTH_EVENTS.JWT_SIGNING_KEY_REVOKED]: JWTSigningKeyRevokedPayload;
  [AUTH_EVENTS.OAUTH_CLIENT_CREATED]: OAuthClientCreatedPayload;
  [AUTH_EVENTS.OAUTH_CLIENT_ROTATED]: OAuthClientRotatedPayload;
  [AUTH_EVENTS.OAUTH_CLIENT_REVOKED]: OAuthClientRevokedPayload;
  [AUTH_EVENTS.OAUTH_TOKEN_ISSUED]: OAuthTokenIssuedPayload;
  [AUTH_EVENTS.OAUTH_SCOPE_DENIED]: OAuthScopeDeniedPayload;
  [AUTH_EVENTS.SSO_LOGIN_INITIATED]: SSOLoginInitiatedPayload;
  [AUTH_EVENTS.SSO_LOGIN_SUCCESS]: SSOLoginSuccessPayload;
  [AUTH_EVENTS.SSO_LOGIN_FAILED]: SSOLoginFailedPayload;
  [AUTH_EVENTS.SSO_ASSERTION_VALIDATED]: SSOAssertionValidatedPayload;
  [AUTH_EVENTS.SSO_ASSERTION_FAILED]: SSOAssertionFailedPayload;
  [AUTH_EVENTS.SSO_TOKEN_EXCHANGED]: SSOTokenExchangedPayload;
  [AUTH_EVENTS.SSO_ACCOUNT_LINKED]: SSOAccountLinkedPayload;
  [AUTH_EVENTS.SSO_ACCOUNT_LINKING_FAILED]: SSOAccountLinkingFailedPayload;
  [AUTH_EVENTS.SSO_JIT_PROVISIONED]: SSOJitProvisionedPayload;
  [AUTH_EVENTS.SSO_JIT_DENIED]: SSOJitDeniedPayload;
  [AUTH_EVENTS.SSO_METADATA_REFRESHED]: SSOMetadataRefreshedPayload;
  [AUTH_EVENTS.SSO_METADATA_FAILED]: SSOMetadataFailedPayload;
  [AUTH_EVENTS.SCIM_USER_PROVISIONED]: SCIMUserProvisionedPayload;
  [AUTH_EVENTS.SCIM_USER_UPDATED]: SCIMUserUpdatedPayload;
  [AUTH_EVENTS.SCIM_USER_DEPROVISIONED]: SCIMUserDeprovisionedPayload;
  [AUTH_EVENTS.SCIM_USER_REACTIVATED]: SCIMUserReactivatedPayload;
  [AUTH_EVENTS.SCIM_GROUP_PROVISIONED]: SCIMGroupProvisionedPayload;
  [AUTH_EVENTS.SCIM_GROUP_UPDATED]: SCIMGroupUpdatedPayload;
  [AUTH_EVENTS.SCIM_GROUP_DELETED]: SCIMGroupDeletedPayload;
  [AUTH_EVENTS.SCIM_GROUP_MEMBERSHIP_CHANGED]: SCIMGroupMembershipChangedPayload;
  [AUTH_EVENTS.SCIM_JIT_RECONCILIATION]: SCIMJitReconciliationPayload;
  [AUTH_EVENTS.SSO_VALIDATION_STARTED]: SSOValidationStartedPayload;
  [AUTH_EVENTS.SSO_VALIDATION_COMPLETED]: SSOValidationCompletedPayload;
  [AUTH_EVENTS.SSO_VALIDATION_FAILED]: SSOValidationFailedPayload;
  [AUTH_EVENTS.SSO_ACTIVATION_SUCCEEDED]: SSOActivationSucceededPayload;
  [AUTH_EVENTS.SSO_ACTIVATION_FAILED]: SSOActivationFailedPayload;
  [AUTH_EVENTS.SSO_DEACTIVATION_SUCCEEDED]: SSODeactivationSucceededPayload;
  [AUTH_EVENTS.SSO_LOGOUT_INITIATED]: SSOLogoutInitiatedPayload;
  [AUTH_EVENTS.SSO_LOGOUT_PROCESSED]: SSOLogoutProcessedPayload;
  [AUTH_EVENTS.SSO_LOGOUT_FAILED]: SSOLogoutFailedPayload;
  [AUTH_EVENTS.SESSION_REVOKED_FEDERATED]: AuthSessionRevokedFederatedPayload;
  [AUTH_EVENTS.SESSION_REVOCATION_FAILED]: AuthSessionRevocationFailedPayload;
  [AUTH_EVENTS.SESSION_REVOCATION_IGNORED]: AuthSessionRevocationIgnoredPayload;
};

export type AuthDomainEvent<T extends AuthEventType = AuthEventType> = DomainEvent<
  AuthEventPayloadMap[T]
>;

interface BaseAuthEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
}

export const createAuthUserCreatedEvent = (
  params: BaseAuthEventParams & { payload: AuthUserCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.USER_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.USER_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthUserUpdatedEvent = (
  params: BaseAuthEventParams & { payload: AuthUserUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.USER_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.USER_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthUserDeactivatedEvent = (
  params: BaseAuthEventParams & { payload: AuthUserDeactivatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.USER_DEACTIVATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.USER_DEACTIVATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionCreatedEvent = (
  params: BaseAuthEventParams & { payload: AuthSessionCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevokedEvent = (
  params: BaseAuthEventParams & { payload: AuthSessionRevokedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthLoginFailedEvent = (
  params: BaseAuthEventParams & { payload: AuthLoginFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.LOGIN_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.LOGIN_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

interface BaseJWTSigningKeyEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  version: number;
}

export const createJWTSigningKeyCreatedEvent = (
  params: BaseJWTSigningKeyEventParams & { payload: JWTSigningKeyCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.JWT_SIGNING_KEY_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.JWT_SIGNING_KEY_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createJWTSigningKeyRotatedEvent = (
  params: BaseJWTSigningKeyEventParams & { payload: JWTSigningKeyRotatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.JWT_SIGNING_KEY_ROTATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.JWT_SIGNING_KEY_ROTATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createJWTSigningKeyRevokedEvent = (
  params: BaseJWTSigningKeyEventParams & { payload: JWTSigningKeyRevokedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.JWT_SIGNING_KEY_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.JWT_SIGNING_KEY_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthPasswordResetRequestedEvent = (
  params: BaseAuthEventParams & { payload: AuthPasswordResetRequestedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.PASSWORD_RESET_REQUESTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.PASSWORD_RESET_REQUESTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthPasswordResetCompletedEvent = (
  params: BaseAuthEventParams & { payload: AuthPasswordResetCompletedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.PASSWORD_RESET_COMPLETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.PASSWORD_RESET_COMPLETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthPasswordResetFailedEvent = (
  params: BaseAuthEventParams & { payload: AuthPasswordResetFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.PASSWORD_RESET_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.PASSWORD_RESET_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthAccountLockedEvent = (
  params: BaseAuthEventParams & { payload: AuthAccountLockedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.ACCOUNT_LOCKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.ACCOUNT_LOCKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthAccountUnlockedEvent = (
  params: BaseAuthEventParams & { payload: AuthAccountUnlockedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.ACCOUNT_UNLOCKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.ACCOUNT_UNLOCKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthNewDeviceSessionEvent = (
  params: BaseAuthEventParams & { payload: AuthNewDeviceSessionPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.NEW_DEVICE_SESSION> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.NEW_DEVICE_SESSION,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaEnabledEvent = (
  params: BaseAuthEventParams & { payload: AuthMfaEnabledPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_ENABLED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_ENABLED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaDisabledEvent = (
  params: BaseAuthEventParams & { payload: AuthMfaDisabledPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_DISABLED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_DISABLED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthMfaRecoveryCodesUsedEvent = (
  params: BaseAuthEventParams & { payload: AuthMfaRecoveryCodesUsedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.MFA_RECOVERY_CODES_USED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.MFA_RECOVERY_CODES_USED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

interface BaseOAuthEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  version: number;
}

export const createOAuthClientCreatedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthClientCreatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_CLIENT_CREATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_CLIENT_CREATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthClientRotatedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthClientRotatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_CLIENT_ROTATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_CLIENT_ROTATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthClientRevokedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthClientRevokedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_CLIENT_REVOKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_CLIENT_REVOKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthTokenIssuedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthTokenIssuedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_TOKEN_ISSUED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_TOKEN_ISSUED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createOAuthScopeDeniedEvent = (
  params: BaseOAuthEventParams & { payload: OAuthScopeDeniedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.OAUTH_SCOPE_DENIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.OAUTH_SCOPE_DENIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

interface BaseSSOEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  version: number;
}

export const createSSOLoginInitiatedEvent = (
  params: BaseSSOEventParams & { payload: SSOLoginInitiatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGIN_INITIATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGIN_INITIATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLoginSuccessEvent = (
  params: BaseSSOEventParams & { payload: SSOLoginSuccessPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGIN_SUCCESS> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGIN_SUCCESS,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLoginFailedEvent = (
  params: BaseSSOEventParams & { payload: SSOLoginFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGIN_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGIN_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAssertionValidatedEvent = (
  params: BaseSSOEventParams & { payload: SSOAssertionValidatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ASSERTION_VALIDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ASSERTION_VALIDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAssertionFailedEvent = (
  params: BaseSSOEventParams & { payload: SSOAssertionFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ASSERTION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ASSERTION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOTokenExchangedEvent = (
  params: BaseSSOEventParams & { payload: SSOTokenExchangedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_TOKEN_EXCHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_TOKEN_EXCHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAccountLinkedEvent = (
  params: BaseSSOEventParams & { payload: SSOAccountLinkedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACCOUNT_LINKED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACCOUNT_LINKED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOAccountLinkingFailedEvent = (
  params: BaseSSOEventParams & { payload: SSOAccountLinkingFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACCOUNT_LINKING_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACCOUNT_LINKING_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOJitProvisionedEvent = (
  params: BaseSSOEventParams & { payload: SSOJitProvisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_JIT_PROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_JIT_PROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOJitDeniedEvent = (
  params: BaseSSOEventParams & { payload: SSOJitDeniedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_JIT_DENIED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_JIT_DENIED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOMetadataRefreshedEvent = (
  params: BaseSSOEventParams & { payload: SSOMetadataRefreshedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_METADATA_REFRESHED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_METADATA_REFRESHED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOMetadataFailedEvent = (
  params: BaseSSOEventParams & { payload: SSOMetadataFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_METADATA_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_METADATA_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMUserProvisionedEvent = (
  params: BaseAuthEventParams & { payload: SCIMUserProvisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_PROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_PROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMUserUpdatedEvent = (
  params: BaseAuthEventParams & { payload: SCIMUserUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMUserDeprovisionedEvent = (
  params: BaseAuthEventParams & { payload: SCIMUserDeprovisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_DEPROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_DEPROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMUserReactivatedEvent = (
  params: BaseAuthEventParams & { payload: SCIMUserReactivatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_USER_REACTIVATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_USER_REACTIVATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupProvisionedEvent = (
  params: BaseAuthEventParams & { payload: SCIMGroupProvisionedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_PROVISIONED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_PROVISIONED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupUpdatedEvent = (
  params: BaseAuthEventParams & { payload: SCIMGroupUpdatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_UPDATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_UPDATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupDeletedEvent = (
  params: BaseAuthEventParams & { payload: SCIMGroupDeletedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_DELETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_DELETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMGroupMembershipChangedEvent = (
  params: BaseAuthEventParams & { payload: SCIMGroupMembershipChangedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_GROUP_MEMBERSHIP_CHANGED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_GROUP_MEMBERSHIP_CHANGED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSCIMJitReconciliationEvent = (
  params: BaseAuthEventParams & { payload: SCIMJitReconciliationPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SCIM_JIT_RECONCILIATION> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SCIM_JIT_RECONCILIATION,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.scimUserId ?? params.payload.jitUserId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOValidationStartedEvent = (
  params: BaseSSOEventParams & { payload: SSOValidationStartedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_VALIDATION_STARTED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_VALIDATION_STARTED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.executedBy ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOValidationCompletedEvent = (
  params: BaseSSOEventParams & { payload: SSOValidationCompletedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_VALIDATION_COMPLETED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_VALIDATION_COMPLETED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOValidationFailedEvent = (
  params: BaseSSOEventParams & { payload: SSOValidationFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_VALIDATION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_VALIDATION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOActivationSucceededEvent = (
  params: BaseSSOEventParams & { payload: SSOActivationSucceededPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACTIVATION_SUCCEEDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACTIVATION_SUCCEEDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.activatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOActivationFailedEvent = (
  params: BaseSSOEventParams & { payload: SSOActivationFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_ACTIVATION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_ACTIVATION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSODeactivationSucceededEvent = (
  params: BaseSSOEventParams & { payload: SSODeactivationSucceededPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_DEACTIVATION_SUCCEEDED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_DEACTIVATION_SUCCEEDED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.deactivatedBy,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLogoutInitiatedEvent = (
  params: BaseSSOEventParams & { payload: SSOLogoutInitiatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGOUT_INITIATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGOUT_INITIATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLogoutProcessedEvent = (
  params: BaseSSOEventParams & { payload: SSOLogoutProcessedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGOUT_PROCESSED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGOUT_PROCESSED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createSSOLogoutFailedEvent = (
  params: BaseSSOEventParams & { payload: SSOLogoutFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SSO_LOGOUT_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SSO_LOGOUT_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevokedFederatedEvent = (
  params: BaseAuthEventParams & { payload: AuthSessionRevokedFederatedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOKED_FEDERATED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOKED_FEDERATED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId,
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevocationFailedEvent = (
  params: BaseAuthEventParams & { payload: AuthSessionRevocationFailedPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOCATION_FAILED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOCATION_FAILED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};

export const createAuthSessionRevocationIgnoredEvent = (
  params: BaseAuthEventParams & { payload: AuthSessionRevocationIgnoredPayload },
): AuthDomainEvent<typeof AUTH_EVENTS.SESSION_REVOCATION_IGNORED> => {
  return {
    eventId: crypto.randomUUID(),
    eventType: AUTH_EVENTS.SESSION_REVOCATION_IGNORED,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.payload.userId ?? '',
    source: params.source,
    version: params.version,
    payload: params.payload,
  };
};
