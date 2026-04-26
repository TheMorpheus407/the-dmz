export {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
  findUserByEmailForPasswordReset,
} from './user.repo.js';

export {
  createSession,
  findSessionById,
  findSessionByTokenHash,
  deleteSession,
  deleteSessionByTokenHash,
  deleteAllSessionsByTenantId,
  deleteAllSessionsByUserId,
  findSessionsByUserId,
  updateSessionLastActive,
  updateSessionTokenHash,
  listTenantSessions,
  findSessionWithUser,
  revokeSessionById,
  countTenantSessions,
  countActiveUserSessions,
  getOldestActiveSession,
  deleteOldestUserSessions,
  findActiveSessionWithContext,
  getSessionMetrics,
  cleanupExpiredSessions,
  getExpiredSessions,
  deleteSessionsByIds,
} from './session.repo.js';
export type {
  SessionListItem,
  ListTenantSessionsParams,
  ActiveSessionInfo,
  SessionMetricsParams,
  SessionMetrics,
  ExpiredSession,
  CleanupExpiredSessionsParams,
  CleanupExpiredSessionsResult,
  GetExpiredSessionsParams,
} from './session.repo.js';

export {
  createProfile,
  findProfileByUserId,
  updateProfile,
  backfillProfiles,
} from './profile.repo.js';
export type { ProfileData, UpdateProfileData } from './profile.repo.js';

export {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  deleteAllPasswordResetTokensForUser,
} from './password-reset.repo.js';
export type { PasswordResetTokenRecord } from './password-reset.repo.js';

export {
  createOAuthClient,
  findOAuthClientByClientIdOnly,
  findOAuthClientByClientId,
  findOAuthClientsByTenantId,
  rotateOAuthClientSecret,
  revokeOAuthClient,
  updateOAuthClientLastUsed,
  deleteOAuthClient,
} from './oauth-client.repo.js';
export type { OAuthClientData } from './oauth-client.repo.js';
