export const SSO_EVENTS = {
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
  SSO_VALIDATION_STARTED: 'auth.sso.validation.started',
  SSO_VALIDATION_COMPLETED: 'auth.sso.validation.completed',
  SSO_VALIDATION_FAILED: 'auth.sso.validation.failed',
  SSO_ACTIVATION_SUCCEEDED: 'auth.sso.activation.succeeded',
  SSO_ACTIVATION_FAILED: 'auth.sso.activation.failed',
  SSO_DEACTIVATION_SUCCEEDED: 'auth.sso.deactivation.succeeded',
  SSO_LOGOUT_INITIATED: 'auth.sso.logout.initiated',
  SSO_LOGOUT_PROCESSED: 'auth.sso.logout.processed',
  SSO_LOGOUT_FAILED: 'auth.sso.logout.failed',
} as const;

export type SsoEventType = (typeof SSO_EVENTS)[keyof typeof SSO_EVENTS];

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
