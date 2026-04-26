/* eslint-disable max-statements */
import { describe, expect, it } from 'vitest';

import * as userRepo from '../user.repo.js';
import * as sessionRepo from '../session.repo.js';
import * as profileRepo from '../profile.repo.js';
import * as passwordResetRepo from '../password-reset.repo.js';
import * as oauthClientRepo from '../oauth-client.repo.js';

describe('focused repo exports', () => {
  describe('user.repo', () => {
    it('should export createUser', () => {
      expect(userRepo.createUser).toBeDefined();
      expect(typeof userRepo.createUser).toBe('function');
    });

    it('should export findUserByEmail', () => {
      expect(userRepo.findUserByEmail).toBeDefined();
      expect(typeof userRepo.findUserByEmail).toBe('function');
    });

    it('should export findUserById', () => {
      expect(userRepo.findUserById).toBeDefined();
      expect(typeof userRepo.findUserById).toBe('function');
    });

    it('should export updateUserPassword', () => {
      expect(userRepo.updateUserPassword).toBeDefined();
      expect(typeof userRepo.updateUserPassword).toBe('function');
    });

    it('should export findUserByEmailForPasswordReset', () => {
      expect(userRepo.findUserByEmailForPasswordReset).toBeDefined();
      expect(typeof userRepo.findUserByEmailForPasswordReset).toBe('function');
    });
  });

  describe('session.repo', () => {
    it('should export createSession', () => {
      expect(sessionRepo.createSession).toBeDefined();
      expect(typeof sessionRepo.createSession).toBe('function');
    });

    it('should export findSessionById', () => {
      expect(sessionRepo.findSessionById).toBeDefined();
      expect(typeof sessionRepo.findSessionById).toBe('function');
    });

    it('should export findSessionByTokenHash', () => {
      expect(sessionRepo.findSessionByTokenHash).toBeDefined();
      expect(typeof sessionRepo.findSessionByTokenHash).toBe('function');
    });

    it('should export deleteSession', () => {
      expect(sessionRepo.deleteSession).toBeDefined();
      expect(typeof sessionRepo.deleteSession).toBe('function');
    });

    it('should export deleteSessionByTokenHash', () => {
      expect(sessionRepo.deleteSessionByTokenHash).toBeDefined();
      expect(typeof sessionRepo.deleteSessionByTokenHash).toBe('function');
    });

    it('should export deleteAllSessionsByTenantId', () => {
      expect(sessionRepo.deleteAllSessionsByTenantId).toBeDefined();
      expect(typeof sessionRepo.deleteAllSessionsByTenantId).toBe('function');
    });

    it('should export deleteAllSessionsByUserId', () => {
      expect(sessionRepo.deleteAllSessionsByUserId).toBeDefined();
      expect(typeof sessionRepo.deleteAllSessionsByUserId).toBe('function');
    });

    it('should export findSessionsByUserId', () => {
      expect(sessionRepo.findSessionsByUserId).toBeDefined();
      expect(typeof sessionRepo.findSessionsByUserId).toBe('function');
    });

    it('should export updateSessionLastActive', () => {
      expect(sessionRepo.updateSessionLastActive).toBeDefined();
      expect(typeof sessionRepo.updateSessionLastActive).toBe('function');
    });

    it('should export updateSessionTokenHash', () => {
      expect(sessionRepo.updateSessionTokenHash).toBeDefined();
      expect(typeof sessionRepo.updateSessionTokenHash).toBe('function');
    });

    it('should export listTenantSessions', () => {
      expect(sessionRepo.listTenantSessions).toBeDefined();
      expect(typeof sessionRepo.listTenantSessions).toBe('function');
    });

    it('should export findSessionWithUser', () => {
      expect(sessionRepo.findSessionWithUser).toBeDefined();
      expect(typeof sessionRepo.findSessionWithUser).toBe('function');
    });

    it('should export revokeSessionById', () => {
      expect(sessionRepo.revokeSessionById).toBeDefined();
      expect(typeof sessionRepo.revokeSessionById).toBe('function');
    });

    it('should export countTenantSessions', () => {
      expect(sessionRepo.countTenantSessions).toBeDefined();
      expect(typeof sessionRepo.countTenantSessions).toBe('function');
    });

    it('should export countActiveUserSessions', () => {
      expect(sessionRepo.countActiveUserSessions).toBeDefined();
      expect(typeof sessionRepo.countActiveUserSessions).toBe('function');
    });

    it('should export getOldestActiveSession', () => {
      expect(sessionRepo.getOldestActiveSession).toBeDefined();
      expect(typeof sessionRepo.getOldestActiveSession).toBe('function');
    });

    it('should export deleteOldestUserSessions', () => {
      expect(sessionRepo.deleteOldestUserSessions).toBeDefined();
      expect(typeof sessionRepo.deleteOldestUserSessions).toBe('function');
    });

    it('should export findActiveSessionWithContext', () => {
      expect(sessionRepo.findActiveSessionWithContext).toBeDefined();
      expect(typeof sessionRepo.findActiveSessionWithContext).toBe('function');
    });

    it('should export getSessionMetrics', () => {
      expect(sessionRepo.getSessionMetrics).toBeDefined();
      expect(typeof sessionRepo.getSessionMetrics).toBe('function');
    });

    it('should export cleanupExpiredSessions', () => {
      expect(sessionRepo.cleanupExpiredSessions).toBeDefined();
      expect(typeof sessionRepo.cleanupExpiredSessions).toBe('function');
    });

    it('should export getExpiredSessions', () => {
      expect(sessionRepo.getExpiredSessions).toBeDefined();
      expect(typeof sessionRepo.getExpiredSessions).toBe('function');
    });

    it('should export deleteSessionsByIds', () => {
      expect(sessionRepo.deleteSessionsByIds).toBeDefined();
      expect(typeof sessionRepo.deleteSessionsByIds).toBe('function');
    });

    it('should export SessionListItem type', () => {
      expect(sessionRepo.SessionListItem).toBeDefined();
    });

    it('should export ListTenantSessionsParams type', () => {
      expect(sessionRepo.ListTenantSessionsParams).toBeDefined();
    });

    it('should export SessionMetricsParams type', () => {
      expect(sessionRepo.SessionMetricsParams).toBeDefined();
    });

    it('should export CleanupExpiredSessionsParams type', () => {
      expect(sessionRepo.CleanupExpiredSessionsParams).toBeDefined();
    });

    it('should export GetExpiredSessionsParams type', () => {
      expect(sessionRepo.GetExpiredSessionsParams).toBeDefined();
    });
  });

  describe('profile.repo', () => {
    it('should export createProfile', () => {
      expect(profileRepo.createProfile).toBeDefined();
      expect(typeof profileRepo.createProfile).toBe('function');
    });

    it('should export findProfileByUserId', () => {
      expect(profileRepo.findProfileByUserId).toBeDefined();
      expect(typeof profileRepo.findProfileByUserId).toBe('function');
    });

    it('should export updateProfile', () => {
      expect(profileRepo.updateProfile).toBeDefined();
      expect(typeof profileRepo.updateProfile).toBe('function');
    });

    it('should export backfillProfiles', () => {
      expect(profileRepo.backfillProfiles).toBeDefined();
      expect(typeof profileRepo.backfillProfiles).toBe('function');
    });

    it('should export ProfileData type', () => {
      expect(profileRepo.ProfileData).toBeDefined();
    });

    it('should export UpdateProfileData type', () => {
      expect(profileRepo.UpdateProfileData).toBeDefined();
    });
  });

  describe('password-reset.repo', () => {
    it('should export createPasswordResetToken', () => {
      expect(passwordResetRepo.createPasswordResetToken).toBeDefined();
      expect(typeof passwordResetRepo.createPasswordResetToken).toBe('function');
    });

    it('should export findValidPasswordResetToken', () => {
      expect(passwordResetRepo.findValidPasswordResetToken).toBeDefined();
      expect(typeof passwordResetRepo.findValidPasswordResetToken).toBe('function');
    });

    it('should export markPasswordResetTokenUsed', () => {
      expect(passwordResetRepo.markPasswordResetTokenUsed).toBeDefined();
      expect(typeof passwordResetRepo.markPasswordResetTokenUsed).toBe('function');
    });

    it('should export deleteAllPasswordResetTokensForUser', () => {
      expect(passwordResetRepo.deleteAllPasswordResetTokensForUser).toBeDefined();
      expect(typeof passwordResetRepo.deleteAllPasswordResetTokensForUser).toBe('function');
    });

    it('should export PasswordResetTokenRecord type', () => {
      expect(passwordResetRepo.PasswordResetTokenRecord).toBeDefined();
    });
  });

  describe('oauth-client.repo', () => {
    it('should export createOAuthClient', () => {
      expect(oauthClientRepo.createOAuthClient).toBeDefined();
      expect(typeof oauthClientRepo.createOAuthClient).toBe('function');
    });

    it('should export findOAuthClientByClientIdOnly', () => {
      expect(oauthClientRepo.findOAuthClientByClientIdOnly).toBeDefined();
      expect(typeof oauthClientRepo.findOAuthClientByClientIdOnly).toBe('function');
    });

    it('should export findOAuthClientByClientId', () => {
      expect(oauthClientRepo.findOAuthClientByClientId).toBeDefined();
      expect(typeof oauthClientRepo.findOAuthClientByClientId).toBe('function');
    });

    it('should export findOAuthClientsByTenantId', () => {
      expect(oauthClientRepo.findOAuthClientsByTenantId).toBeDefined();
      expect(typeof oauthClientRepo.findOAuthClientsByTenantId).toBe('function');
    });

    it('should export rotateOAuthClientSecret', () => {
      expect(oauthClientRepo.rotateOAuthClientSecret).toBeDefined();
      expect(typeof oauthClientRepo.rotateOAuthClientSecret).toBe('function');
    });

    it('should export revokeOAuthClient', () => {
      expect(oauthClientRepo.revokeOAuthClient).toBeDefined();
      expect(typeof oauthClientRepo.revokeOAuthClient).toBe('function');
    });

    it('should export updateOAuthClientLastUsed', () => {
      expect(oauthClientRepo.updateOAuthClientLastUsed).toBeDefined();
      expect(typeof oauthClientRepo.updateOAuthClientLastUsed).toBe('function');
    });

    it('should export deleteOAuthClient', () => {
      expect(oauthClientRepo.deleteOAuthClient).toBeDefined();
      expect(typeof oauthClientRepo.deleteOAuthClient).toBe('function');
    });

    it('should export OAuthClientData type', () => {
      expect(oauthClientRepo.OAuthClientData).toBeDefined();
    });
  });
});
