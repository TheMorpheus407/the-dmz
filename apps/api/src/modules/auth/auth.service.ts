export {
  hashPassword,
  verifyPassword,
  hashToken,
  generateTokens,
  validatePasswordAgainstPolicy,
  screenPasswordForCompromise,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from './auth.crypto.js';

export { resolveTenantId, type ResolveTenantOptions, type ResolvedTenant } from './auth.utils.js';

export { register } from './auth.registration.service.js';

export { login, type LoginOptions } from './auth.login.service.js';

export {
  refresh,
  logout,
  verifyAccessToken,
  invalidateTenantSessions,
  type RefreshOptions,
} from './auth.session.service.js';

export {
  requestPasswordReset,
  changePasswordWithToken,
  type RequestPasswordResetResult,
  type ChangePasswordWithTokenResult,
} from './auth.password.service.js';

export {
  createOAuthClient,
  listOAuthClients,
  findOAuthClientByClientIdOnly,
  rotateOAuthClientSecret,
  revokeOAuthClient,
  deleteOAuthClient,
  issueClientCredentialsToken,
  verifyOAuthToken,
  hasRequiredOAuthScope,
  type CreateOAuthClientResult,
  type OAuthClientInfo,
} from './auth.oauth-client.service.js';

export {
  revokeUserSessionsByFederatedIdentity,
  revokeAllTenantSessionsFederated,
  listTenantSessions,
  revokeSingleSession,
  revokeAllUserSessions,
  revokeAllTenantSessions,
  handleUserRoleChange,
  type FederatedRevocationInput,
  type FederatedRevocationResult,
  type ListTenantSessionsInput,
  type SessionListEntry,
  type ListTenantSessionsResult,
  type RevokeSingleSessionInput,
  type RevokeSingleSessionResult,
  type RevokeAllUserSessionsInput,
  type RevokeAllUserSessionsResult,
  type RevokeAllTenantSessionsInput,
  type RevokeAllTenantSessionsResult,
  type HandleUserRoleChangeInput,
  type HandleUserRoleChangeResult,
} from './auth.session-management.service.js';

export {
  getCurrentUser,
  getProfile,
  updateUserProfile,
  getEffectivePreferences,
} from './auth.profile.service.js';
