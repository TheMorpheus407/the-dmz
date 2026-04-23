import { eq, and, or } from 'drizzle-orm';

import { SessionRevocationReason } from '@the-dmz/shared/auth/session-policy.js';
import { DEFAULT_PAGINATION_LIMIT } from '@the-dmz/shared/utils';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';

import { resolveTenantSessionPolicy } from './session-policy.service.js';
import {
  findUserByEmail,
  findUserById,
  deleteAllSessionsByUserId,
  deleteAllSessionsByTenantId,
  listTenantSessions as listTenantSessionsRepo,
  findSessionWithUser,
  revokeSessionById,
  countTenantSessions,
} from './auth.repo.js';

import type { AppConfig } from '../../config.js';

export interface FederatedRevocationInput {
  tenantId: string;
  userId?: string;
  email?: string;
  sourceType: 'saml' | 'oidc' | 'scim' | 'admin';
  ssoProviderId?: string;
}

export interface FederatedRevocationResult {
  result: 'revoked' | 'already_revoked' | 'ignored_invalid' | 'failed';
  sessionsRevoked: number;
  userId?: string;
  reason?: string;
}

export const revokeUserSessionsByFederatedIdentity = async (
  config: AppConfig,
  input: FederatedRevocationInput,
): Promise<FederatedRevocationResult> => {
  const db = getDatabaseClient(config);

  let targetUserId = input.userId;
  let targetTenantId = input.tenantId;

  if (!targetUserId && input.email) {
    const user = await findUserByEmail(db, input.email, input.tenantId);
    if (!user) {
      return {
        result: 'ignored_invalid',
        sessionsRevoked: 0,
        reason: 'user_not_found',
      };
    }
    targetUserId = user.id;
    targetTenantId = user.tenantId;
  }

  if (!targetUserId) {
    return {
      result: 'ignored_invalid',
      sessionsRevoked: 0,
      reason: 'user_identity_required',
    };
  }

  if (targetTenantId !== input.tenantId) {
    return {
      result: 'ignored_invalid',
      sessionsRevoked: 0,
      reason: 'tenant_mismatch',
    };
  }

  const sessionsBefore = await db.query.sessions.findMany({
    where: (sessions, { eq, and }) =>
      and(eq(sessions.userId, targetUserId), eq(sessions.tenantId, targetTenantId)),
  });

  if (sessionsBefore.length === 0) {
    return {
      result: 'already_revoked',
      sessionsRevoked: 0,
      userId: targetUserId,
      reason: 'no_active_sessions',
    };
  }

  const sessionsRevoked = await deleteAllSessionsByUserId(db, targetUserId, targetTenantId);

  return {
    result: 'revoked',
    sessionsRevoked,
    userId: targetUserId,
    reason: `${input.sourceType}_revocation`,
  };
};

export const revokeAllTenantSessionsFederated = async (
  config: AppConfig,
  tenantId: string,
  _reason: string,
): Promise<number> => {
  const db = getDatabaseClient(config);
  return deleteAllSessionsByTenantId(db, tenantId);
};

export interface ListTenantSessionsInput {
  tenantId: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}

export interface SessionListEntry {
  sessionId: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  deviceInfo: {
    userAgent: string | null;
    ipAddress: string | null;
  } | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface ListTenantSessionsResult {
  sessions: SessionListEntry[];
  nextCursor: string | undefined;
  total: number;
}

export const listTenantSessions = async (
  config: AppConfig,
  input: ListTenantSessionsInput,
): Promise<ListTenantSessionsResult> => {
  const db = getDatabaseClient(config);
  const limit = input.limit ?? DEFAULT_PAGINATION_LIMIT;

  const repoInput: {
    tenantId: string;
    userId?: string;
    cursor?: string;
    limit: number;
  } = {
    tenantId: input.tenantId,
    limit,
  };

  if (input.userId) {
    repoInput.userId = input.userId;
  }
  if (input.cursor) {
    repoInput.cursor = input.cursor;
  }

  const { sessions, nextCursor } = await listTenantSessionsRepo(db, repoInput);

  const total = await countTenantSessions(db, input.tenantId, input.userId);

  const now = new Date();
  const sessionEntries: SessionListEntry[] = sessions.map((session) => {
    let status: 'active' | 'expired' | 'revoked' = 'active';
    if (session.expiresAt < now) {
      status = 'expired';
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      userEmail: '',
      tenantId: session.tenantId,
      createdAt: session.createdAt,
      lastSeenAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      deviceInfo:
        session.ipAddress || session.userAgent
          ? {
              userAgent: session.userAgent,
              ipAddress: session.ipAddress,
            }
          : null,
      status,
    };
  });

  const userIds = [...new Set(sessionEntries.map((s) => s.userId))];
  if (userIds.length > 0) {
    const userRecords = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, input.tenantId),
        or(...userIds.map((id) => eq(users.userId, id))),
      ),
      columns: {
        userId: true,
        email: true,
      },
    });

    const userEmailMap = new Map(userRecords.map((u) => [u.userId, u.email]));

    for (const session of sessionEntries) {
      session.userEmail = userEmailMap.get(session.userId) ?? '';
    }
  }

  return {
    sessions: sessionEntries,
    nextCursor,
    total,
  };
};

export interface RevokeSingleSessionInput {
  sessionId: string;
  tenantId: string;
}

export interface RevokeSingleSessionResult {
  result: 'revoked' | 'already_revoked' | 'not_found' | 'forbidden' | 'failed';
  sessionId: string;
  reason: string;
}

export const revokeSingleSession = async (
  config: AppConfig,
  input: RevokeSingleSessionInput,
): Promise<RevokeSingleSessionResult> => {
  const db = getDatabaseClient(config);

  const session = await findSessionWithUser(db, input.sessionId, input.tenantId);

  if (!session) {
    return {
      result: 'not_found',
      sessionId: input.sessionId,
      reason: 'session_not_found',
    };
  }

  const revokeResult = await revokeSessionById(db, input.sessionId, input.tenantId);

  if (!revokeResult.success) {
    return {
      result: 'failed',
      sessionId: input.sessionId,
      reason: 'revocation_failed',
    };
  }

  return {
    result: 'revoked',
    sessionId: input.sessionId,
    reason: 'admin_revoked',
  };
};

export interface RevokeAllUserSessionsInput {
  userId: string;
  tenantId: string;
  initiatedBy: string;
}

export interface RevokeAllUserSessionsResult {
  result: 'revoked' | 'already_revoked' | 'not_found' | 'forbidden' | 'failed';
  sessionsRevoked: number;
  reason: string;
}

export const revokeAllUserSessions = async (
  config: AppConfig,
  input: RevokeAllUserSessionsInput,
): Promise<RevokeAllUserSessionsResult> => {
  const db = getDatabaseClient(config);

  const user = await findUserById(db, input.userId, input.tenantId);

  if (!user) {
    return {
      result: 'not_found',
      sessionsRevoked: 0,
      reason: 'user_not_found',
    };
  }

  const sessionsBefore = await db.query.sessions.findMany({
    where: and(eq(sessionsTable.userId, input.userId), eq(sessionsTable.tenantId, input.tenantId)),
  });

  if (sessionsBefore.length === 0) {
    return {
      result: 'already_revoked',
      sessionsRevoked: 0,
      reason: 'no_active_sessions',
    };
  }

  const sessionsRevoked = await deleteAllSessionsByUserId(db, input.userId, input.tenantId);

  return {
    result: 'revoked',
    sessionsRevoked,
    reason: 'admin_revoked',
  };
};

export interface RevokeAllTenantSessionsInput {
  tenantId: string;
  initiatedBy: string;
}

export interface RevokeAllTenantSessionsResult {
  result: 'revoked' | 'failed';
  sessionsRevoked: number;
  reason: string;
}

export const revokeAllTenantSessions = async (
  config: AppConfig,
  input: RevokeAllTenantSessionsInput,
): Promise<RevokeAllTenantSessionsResult> => {
  const db = getDatabaseClient(config);

  const sessionsRevoked = await deleteAllSessionsByTenantId(db, input.tenantId);

  return {
    result: 'revoked',
    sessionsRevoked,
    reason: 'tenant_wide_admin_revocation',
  };
};

export interface HandleUserRoleChangeInput {
  userId: string;
  tenantId: string;
  oldRole: string;
  newRole: string;
}

export interface HandleUserRoleChangeResult {
  sessionsRevoked: number;
  reason: string;
}

export const handleUserRoleChange = async (
  config: AppConfig,
  input: HandleUserRoleChangeInput,
): Promise<HandleUserRoleChangeResult> => {
  if (input.oldRole === input.newRole) {
    return { sessionsRevoked: 0, reason: 'role_unchanged' };
  }

  const db = getDatabaseClient(config);

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.tenantId, input.tenantId),
    columns: {
      tenantId: true,
      settings: true,
    },
  });

  const sessionPolicy = resolveTenantSessionPolicy(
    tenant?.settings as Record<string, unknown> | undefined,
  );

  if (!sessionPolicy.forceLogoutOnRoleChange) {
    return { sessionsRevoked: 0, reason: 'force_logout_disabled' };
  }

  const sessionsRevoked = await deleteAllSessionsByUserId(db, input.userId, input.tenantId);

  return {
    sessionsRevoked,
    reason: SessionRevocationReason.ROLE_CHANGED,
  };
};
