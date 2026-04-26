/* eslint-disable max-lines */
import { eq, and, sql, isNull, lt, desc, gte } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
import { assertCreated } from '../../shared/utils/db-utils.js';

import type { AuthSession } from './auth.types.js';

export interface SessionListItem {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ListTenantSessionsParams {
  tenantId: string;
  userId?: string;
  cursor?: string;
  limit: number;
}

export interface ActiveSessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
}

export interface SessionMetricsParams {
  tenantId: string;
  fifteenMinutesAgo: Date;
  oneDayAgo: Date;
  sevenDaysAgo: Date;
  thirtyDaysAgo: Date;
  now: Date;
}

export interface SessionMetrics {
  activeSessionCount: number;
  usersOnlineLast15Min: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  userGrowthTrend: Array<{ date: string; count: number }>;
}

export interface ExpiredSession {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface CleanupExpiredSessionsParams {
  tenantId: string;
  expiryDate: Date;
  limit: number;
}

export interface CleanupExpiredSessionsResult {
  deletedCount: number;
  deletedIds: string[];
}

export interface GetExpiredSessionsParams {
  tenantId: string;
  expiryDate: Date;
  limit: number;
}

export const createSession = async (
  db: DB,
  data: {
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<AuthSession> => {
  const sessionValues: {
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  } = {
    userId: data.userId,
    tenantId: data.tenantId,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ?? null,
  };

  const [session] = await db.insert(sessionsTable).values(sessionValues).returning({
    id: sessionsTable.id,
    userId: sessionsTable.userId,
    tenantId: sessionsTable.tenantId,
    expiresAt: sessionsTable.expiresAt,
    createdAt: sessionsTable.createdAt,
    lastActiveAt: sessionsTable.lastActiveAt,
  });

  return assertCreated(session, 'session');
};

export const findSessionById = async (db: DB, sessionId: string): Promise<AuthSession | null> => {
  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, sessionId),
  });

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    tenantId: session.tenantId,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
  };
};

export const findSessionByTokenHash = async (
  db: DB,
  tokenHash: string,
): Promise<AuthSession | null> => {
  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.tokenHash, tokenHash),
  });

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    tenantId: session.tenantId,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
  };
};

export const deleteSession = async (db: DB, sessionId: string): Promise<void> => {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
};

export const deleteSessionByTokenHash = async (db: DB, tokenHash: string): Promise<void> => {
  await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
};

export const deleteAllSessionsByTenantId = async (db: DB, tenantId: string): Promise<number> => {
  const deletedSessions = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.tenantId, tenantId))
    .returning({ id: sessionsTable.id });
  return deletedSessions.length;
};

export const deleteAllSessionsByUserId = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<number> => {
  const deletedSessions = await db
    .delete(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.tenantId, tenantId)))
    .returning({ id: sessionsTable.id });
  return deletedSessions.length;
};

export const findSessionsByUserId = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    userId: string;
    tenantId: string;
    expiresAt: Date;
    createdAt: Date;
    lastActiveAt: Date | null;
  }>
> => {
  return db.query.sessions.findMany({
    where: and(eq(sessionsTable.userId, userId), eq(sessionsTable.tenantId, tenantId)),
  });
};

export const updateSessionLastActive = async (db: DB, sessionId: string): Promise<void> => {
  await db
    .update(sessionsTable)
    .set({ lastActiveAt: new Date() })
    .where(eq(sessionsTable.id, sessionId));
};

export const updateSessionTokenHash = async (
  db: DB,
  sessionId: string,
  tokenHash: string,
): Promise<void> => {
  await db.update(sessionsTable).set({ tokenHash }).where(eq(sessionsTable.id, sessionId));
};

export const listTenantSessions = async (
  db: DB,
  params: ListTenantSessionsParams,
): Promise<{ sessions: SessionListItem[]; nextCursor: string | undefined }> => {
  const { tenantId, userId, cursor, limit } = params;

  const conditions: ReturnType<typeof eq>[] = [];
  conditions.push(eq(sessionsTable.tenantId, tenantId));

  if (userId) {
    conditions.push(eq(sessionsTable.userId, userId));
  }

  if (cursor) {
    const cursorDate = new Date(cursor);
    conditions.push(lt(sessionsTable.createdAt, cursorDate));
  }

  const baseWhere = conditions.length > 1 ? and(...conditions) : conditions[0];

  const results = await db
    .select({
      id: sessionsTable.id,
      userId: sessionsTable.userId,
      tenantId: sessionsTable.tenantId,
      expiresAt: sessionsTable.expiresAt,
      createdAt: sessionsTable.createdAt,
      lastActiveAt: sessionsTable.lastActiveAt,
      ipAddress: sessionsTable.ipAddress,
      userAgent: sessionsTable.userAgent,
    })
    .from(sessionsTable)
    .where(baseWhere)
    .orderBy(desc(sessionsTable.createdAt))
    .limit(limit + 1);

  let nextCursor: string | undefined;
  if (results.length > limit) {
    const lastSession = results[limit - 1]!;
    nextCursor = lastSession.createdAt.toISOString();
    results.pop();
  }

  return { sessions: results, nextCursor };
};

export const findSessionWithUser = async (
  db: DB,
  sessionId: string,
  tenantId: string,
): Promise<(SessionListItem & { email: string }) | null> => {
  const result = await db
    .select({
      id: sessionsTable.id,
      userId: sessionsTable.userId,
      tenantId: sessionsTable.tenantId,
      expiresAt: sessionsTable.expiresAt,
      createdAt: sessionsTable.createdAt,
      lastActiveAt: sessionsTable.lastActiveAt,
      ipAddress: sessionsTable.ipAddress,
      userAgent: sessionsTable.userAgent,
      email: users.email,
    })
    .from(sessionsTable)
    .leftJoin(
      users,
      and(eq(sessionsTable.userId, users.userId), eq(sessionsTable.tenantId, users.tenantId)),
    )
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0]!;
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    email: row.email ?? '',
  };
};

export const revokeSessionById = async (
  db: DB,
  sessionId: string,
  tenantId: string,
): Promise<{ success: boolean; alreadyRevoked: boolean }> => {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessionsTable.id, sessionId), eq(sessionsTable.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, alreadyRevoked: false };
  }

  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));

  return { success: true, alreadyRevoked: false };
};

export const countTenantSessions = async (
  db: DB,
  tenantId: string,
  userId?: string,
): Promise<number> => {
  const conditions = [eq(sessionsTable.tenantId, tenantId)];

  if (userId) {
    conditions.push(eq(sessionsTable.userId, userId));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionsTable)
    .where(whereClause);

  return result[0]?.count ?? 0;
};

export const countActiveUserSessions = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<number> => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.tenantId, tenantId),
        isNull(sessionsTable.mfaVerifiedAt),
      ),
    );

  return result[0]?.count ?? 0;
};

export const getOldestActiveSession = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<ActiveSessionInfo | null> => {
  const result = await db
    .select({
      id: sessionsTable.id,
      userId: sessionsTable.userId,
      tenantId: sessionsTable.tenantId,
      expiresAt: sessionsTable.expiresAt,
      createdAt: sessionsTable.createdAt,
      lastActiveAt: sessionsTable.lastActiveAt,
      ipAddress: sessionsTable.ipAddress,
      userAgent: sessionsTable.userAgent,
      deviceFingerprint: sessionsTable.deviceFingerprint,
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.tenantId, tenantId)))
    .orderBy(sessionsTable.createdAt)
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0]!;
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    deviceFingerprint: row.deviceFingerprint,
  };
};

export const deleteOldestUserSessions = async (
  db: DB,
  userId: string,
  tenantId: string,
  keepCount: number,
): Promise<number> => {
  const userSessions = await db
    .select({
      id: sessionsTable.id,
      createdAt: sessionsTable.createdAt,
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.tenantId, tenantId)))
    .orderBy(sessionsTable.createdAt)
    .limit(keepCount + 1);

  if (userSessions.length <= keepCount) {
    return 0;
  }

  const idsToDelete = userSessions.slice(keepCount).map((s) => s.id);

  const deleted = await db
    .delete(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        eq(sessionsTable.tenantId, tenantId),
        sql`${sessionsTable.id} IN (${sql.join(idsToDelete.map((id) => sql`${id}`))})`,
      ),
    )
    .returning({ id: sessionsTable.id });

  return deleted.length;
};

export const findActiveSessionWithContext = async (
  db: DB,
  sessionId: string,
): Promise<ActiveSessionInfo | null> => {
  const result = await db
    .select({
      id: sessionsTable.id,
      userId: sessionsTable.userId,
      tenantId: sessionsTable.tenantId,
      expiresAt: sessionsTable.expiresAt,
      createdAt: sessionsTable.createdAt,
      lastActiveAt: sessionsTable.lastActiveAt,
      ipAddress: sessionsTable.ipAddress,
      userAgent: sessionsTable.userAgent,
      deviceFingerprint: sessionsTable.deviceFingerprint,
    })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0]!;
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    deviceFingerprint: row.deviceFingerprint,
  };
};

export const getSessionMetrics = async (
  db: DB,
  params: SessionMetricsParams,
): Promise<SessionMetrics> => {
  const { tenantId, fifteenMinutesAgo, oneDayAgo, sevenDaysAgo, thirtyDaysAgo, now } = params;

  const [activeSessionCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tenantId, tenantId), gte(sessionsTable.expiresAt, now)));

  const [usersOnlineLast15MinResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tenantId, tenantId),
        gte(sessionsTable.lastActiveAt, fifteenMinutesAgo),
        gte(sessionsTable.expiresAt, now),
      ),
    );

  const [dailyActiveUsersResult] = await db
    .select({ count: sql<number>`count(DISTINCT ${sessionsTable.userId})` })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tenantId, tenantId), gte(sessionsTable.lastActiveAt, oneDayAgo)));

  const [weeklyActiveUsersResult] = await db
    .select({ count: sql<number>`count(DISTINCT ${sessionsTable.userId})` })
    .from(sessionsTable)
    .where(
      and(eq(sessionsTable.tenantId, tenantId), gte(sessionsTable.lastActiveAt, sevenDaysAgo)),
    );

  const [monthlyActiveUsersResult] = await db
    .select({ count: sql<number>`count(DISTINCT ${sessionsTable.userId})` })
    .from(sessionsTable)
    .where(
      and(eq(sessionsTable.tenantId, tenantId), gte(sessionsTable.lastActiveAt, thirtyDaysAgo)),
    );

  const userGrowthTrendRaw = await db
    .select({
      date: sql<string>`DATE(${sessionsTable.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tenantId, tenantId), gte(sessionsTable.createdAt, thirtyDaysAgo)))
    .groupBy(sql`DATE(${sessionsTable.createdAt})`)
    .orderBy(sql`DATE(${sessionsTable.createdAt})`);

  return {
    activeSessionCount: activeSessionCountResult?.count ?? 0,
    usersOnlineLast15Min: usersOnlineLast15MinResult?.count ?? 0,
    dailyActiveUsers: Number(dailyActiveUsersResult?.count ?? 0),
    weeklyActiveUsers: Number(weeklyActiveUsersResult?.count ?? 0),
    monthlyActiveUsers: Number(monthlyActiveUsersResult?.count ?? 0),
    userGrowthTrend: userGrowthTrendRaw.map((row) => ({
      date: row.date,
      count: Number(row.count),
    })),
  };
};

export const cleanupExpiredSessions = async (
  db: DB,
  params: CleanupExpiredSessionsParams,
): Promise<CleanupExpiredSessionsResult> => {
  const { tenantId, expiryDate, limit } = params;

  const expiredToDelete = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tenantId, tenantId), lt(sessionsTable.expiresAt, expiryDate)))
    .limit(limit);

  if (expiredToDelete.length === 0) {
    return { deletedCount: 0, deletedIds: [] };
  }

  const idsToDelete = expiredToDelete.map((s) => s.id);

  const deleted = await db
    .delete(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tenantId, tenantId),
        sql`${sessionsTable.id} IN (${sql.join(idsToDelete.map((id) => sql`${id}`))})`,
      ),
    )
    .returning({ id: sessionsTable.id });

  return {
    deletedCount: deleted.length,
    deletedIds: deleted.map((d) => d.id),
  };
};

export const getExpiredSessions = async (
  db: DB,
  params: GetExpiredSessionsParams,
): Promise<ExpiredSession[]> => {
  const { tenantId, expiryDate, limit } = params;

  return db
    .select({
      id: sessionsTable.id,
      userId: sessionsTable.userId,
      tenantId: sessionsTable.tenantId,
      expiresAt: sessionsTable.expiresAt,
      createdAt: sessionsTable.createdAt,
      lastActiveAt: sessionsTable.lastActiveAt,
      ipAddress: sessionsTable.ipAddress,
      userAgent: sessionsTable.userAgent,
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tenantId, tenantId), lt(sessionsTable.expiresAt, expiryDate)))
    .limit(limit);
};

export const deleteSessionsByIds = async (
  db: DB,
  tenantId: string,
  sessionIds: string[],
): Promise<number> => {
  if (sessionIds.length === 0) {
    return 0;
  }

  const deleted = await db
    .delete(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tenantId, tenantId),
        sql`${sessionsTable.id} IN (${sql.join(sessionIds.map((id) => sql`${id}`))})`,
      ),
    )
    .returning({ id: sessionsTable.id });

  return deleted.length;
};
