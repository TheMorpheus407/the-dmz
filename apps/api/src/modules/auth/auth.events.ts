import type { DomainEvent } from '../../shared/events/event-types.js';
import type {
  AuthUserCreatedPayload,
  AuthUserUpdatedPayload,
  AuthUserDeactivatedPayload,
} from './events/user.events.js';
import type {
  AuthSessionCreatedPayload,
  AuthSessionRevokedPayload,
  AuthSessionRevokedFederatedPayload,
  AuthSessionRevocationFailedPayload,
  AuthSessionRevocationIgnoredPayload,
  AuthSessionRevokedAdminPayload,
  AuthSessionRevokedUserAllPayload,
  AuthSessionRevokedTenantAllPayload,
  AuthSessionRevocationDeniedPayload,
} from './events/session.events.js';
import type {
  AuthLoginFailedPayload,
  AuthPasswordResetRequestedPayload,
  AuthPasswordResetCompletedPayload,
  AuthPasswordResetFailedPayload,
  AuthAccountLockedPayload,
  AuthAccountUnlockedPayload,
  AuthNewDeviceSessionPayload,
} from './events/login.events.js';
import type {
  AuthMfaEnabledPayload,
  AuthMfaDisabledPayload,
  AuthMfaRecoveryCodesUsedPayload,
  AuthMfaPolicyUpdatedPayload,
  AuthMfaChallengeRequiredPayload,
  AuthMfaChallengeSucceededPayload,
  AuthMfaChallengeFailedPayload,
  AuthMfaEnrollmentDeferredPayload,
  AuthMfaEnrollmentExpiredPayload,
  AuthStepUpRequiredPayload,
  AuthStepUpSucceededPayload,
  AuthStepUpFailedPayload,
  AuthAdaptiveMfaTriggeredPayload,
} from './events/mfa.events.js';
import type {
  JWTSigningKeyCreatedPayload,
  JWTSigningKeyRotatedPayload,
  JWTSigningKeyRevokedPayload,
} from './events/jwt.events.js';
import type {
  OAuthClientCreatedPayload,
  OAuthClientRotatedPayload,
  OAuthClientRevokedPayload,
  OAuthTokenIssuedPayload,
  OAuthTokenRevokedPayload,
  OAuthScopeDeniedPayload,
} from './events/oauth.events.js';
import type {
  SSOLoginInitiatedPayload,
  SSOLoginSuccessPayload,
  SSOLoginFailedPayload,
  SSOAssertionValidatedPayload,
  SSOAssertionFailedPayload,
  SSOTokenExchangedPayload,
  SSOAccountLinkedPayload,
  SSOAccountLinkingFailedPayload,
  SSOJitProvisionedPayload,
  SSOJitDeniedPayload,
  SSOMetadataRefreshedPayload,
  SSOMetadataFailedPayload,
  SSOValidationStartedPayload,
  SSOValidationCompletedPayload,
  SSOValidationFailedPayload,
  SSOActivationSucceededPayload,
  SSOActivationFailedPayload,
  SSODeactivationSucceededPayload,
  SSOLogoutInitiatedPayload,
  SSOLogoutProcessedPayload,
  SSOLogoutFailedPayload,
} from './events/sso.events.js';
import type {
  SCIMUserProvisionedPayload,
  SCIMUserUpdatedPayload,
  SCIMUserDeprovisionedPayload,
  SCIMUserReactivatedPayload,
  SCIMGroupProvisionedPayload,
  SCIMGroupUpdatedPayload,
  SCIMGroupDeletedPayload,
  SCIMGroupMembershipChangedPayload,
  SCIMJitReconciliationPayload,
} from './events/scim.events.js';
import type {
  AuthDelegationRoleCreatedPayload,
  AuthDelegationRoleUpdatedPayload,
  AuthDelegationRoleAssignedPayload,
  AuthDelegationDeniedPayload,
} from './events/delegation.events.js';
import type {
  AuthApiKeyCreatedPayload,
  AuthApiKeyRotatedPayload,
  AuthApiKeyRevokedPayload,
  AuthApiKeyRejectedPayload,
} from './events/api-key.events.js';

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
  SESSION_REVOKED_ADMIN: 'auth.session.revoked.admin',
  SESSION_REVOKED_USER_ALL: 'auth.session.revoked.user_all',
  SESSION_REVOKED_TENANT_ALL: 'auth.session.revoked.tenant_all',
  SESSION_REVOCATION_DENIED: 'auth.session.revocation.denied',
  MFA_POLICY_UPDATED: 'auth.mfa.policy.updated',
  MFA_CHALLENGE_REQUIRED: 'auth.mfa.challenge.required',
  MFA_CHALLENGE_SUCCEEDED: 'auth.mfa.challenge.succeeded',
  MFA_CHALLENGE_FAILED: 'auth.mfa.challenge.failed',
  MFA_ENROLLMENT_DEFERRED: 'auth.mfa.enrollment.deferred',
  MFA_ENROLLMENT_EXPIRED: 'auth.mfa.enrollment.expired',
  STEP_UP_REQUIRED: 'auth.step_up.required',
  STEP_UP_SUCCEEDED: 'auth.step_up.succeeded',
  STEP_UP_FAILED: 'auth.step_up.failed',
  ADAPTIVE_MFA_TRIGGERED: 'auth.adaptive_mfa.triggered',
  DELEGATION_ROLE_CREATED: 'auth.delegation.role.created',
  DELEGATION_ROLE_UPDATED: 'auth.delegation.role.updated',
  DELEGATION_ROLE_ASSIGNED: 'auth.delegation.role.assigned',
  DELEGATION_DENIED: 'auth.delegation.denied',
  API_KEY_CREATED: 'auth.api_key.created',
  API_KEY_ROTATED: 'auth.api_key.rotated',
  API_KEY_REVOKED: 'auth.api_key.revoked',
  API_KEY_REJECTED: 'auth.api_key.rejected',
} as const;

export type AuthEventType = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

export interface AuthEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
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
  [AUTH_EVENTS.OAUTH_TOKEN_REVOKED]: OAuthTokenRevokedPayload;
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
  [AUTH_EVENTS.SESSION_REVOKED_ADMIN]: AuthSessionRevokedAdminPayload;
  [AUTH_EVENTS.SESSION_REVOKED_USER_ALL]: AuthSessionRevokedUserAllPayload;
  [AUTH_EVENTS.SESSION_REVOKED_TENANT_ALL]: AuthSessionRevokedTenantAllPayload;
  [AUTH_EVENTS.SESSION_REVOCATION_DENIED]: AuthSessionRevocationDeniedPayload;
  [AUTH_EVENTS.MFA_POLICY_UPDATED]: AuthMfaPolicyUpdatedPayload;
  [AUTH_EVENTS.MFA_CHALLENGE_REQUIRED]: AuthMfaChallengeRequiredPayload;
  [AUTH_EVENTS.MFA_CHALLENGE_SUCCEEDED]: AuthMfaChallengeSucceededPayload;
  [AUTH_EVENTS.MFA_CHALLENGE_FAILED]: AuthMfaChallengeFailedPayload;
  [AUTH_EVENTS.MFA_ENROLLMENT_DEFERRED]: AuthMfaEnrollmentDeferredPayload;
  [AUTH_EVENTS.MFA_ENROLLMENT_EXPIRED]: AuthMfaEnrollmentExpiredPayload;
  [AUTH_EVENTS.STEP_UP_REQUIRED]: AuthStepUpRequiredPayload;
  [AUTH_EVENTS.STEP_UP_SUCCEEDED]: AuthStepUpSucceededPayload;
  [AUTH_EVENTS.STEP_UP_FAILED]: AuthStepUpFailedPayload;
  [AUTH_EVENTS.ADAPTIVE_MFA_TRIGGERED]: AuthAdaptiveMfaTriggeredPayload;
  [AUTH_EVENTS.DELEGATION_ROLE_CREATED]: AuthDelegationRoleCreatedPayload;
  [AUTH_EVENTS.DELEGATION_ROLE_UPDATED]: AuthDelegationRoleUpdatedPayload;
  [AUTH_EVENTS.DELEGATION_ROLE_ASSIGNED]: AuthDelegationRoleAssignedPayload;
  [AUTH_EVENTS.DELEGATION_DENIED]: AuthDelegationDeniedPayload;
  [AUTH_EVENTS.API_KEY_CREATED]: AuthApiKeyCreatedPayload;
  [AUTH_EVENTS.API_KEY_ROTATED]: AuthApiKeyRotatedPayload;
  [AUTH_EVENTS.API_KEY_REVOKED]: AuthApiKeyRevokedPayload;
  [AUTH_EVENTS.API_KEY_REJECTED]: AuthApiKeyRejectedPayload;
};

export type AuthDomainEvent<T extends AuthEventType = AuthEventType> = DomainEvent<
  AuthEventPayloadMap[T]
>;

export * from './events/user.events.js';
export * from './events/session.events.js';
export * from './events/login.events.js';
export * from './events/mfa.events.js';
export * from './events/jwt.events.js';
export * from './events/oauth.events.js';
export * from './events/sso.events.js';
export * from './events/scim.events.js';
export * from './events/delegation.events.js';
export * from './events/api-key.events.js';
export * from './events/index.js';
