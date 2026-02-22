import { eq, and } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';

import { UserExistsError } from './auth.errors.js';

import type { AuthUser, AuthSession } from './auth.types.js';

export const createUser = async (
  db: DB,
  data: {
    email: string;
    passwordHash: string;
    displayName: string;
    tenantId: string;
  },
): Promise<AuthUser> => {
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, data.email), eq(users.tenantId, data.tenantId)),
  });

  if (existing) {
    throw new UserExistsError();
  }

  const [created] = await db
    .insert(users)
    .values({
      email: data.email,
      passwordHash: data.passwordHash,
      displayName: data.displayName,
      tenantId: data.tenantId,
      role: 'learner',
    })
    .returning({
      userId: users.userId,
      tenantId: users.tenantId,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
    });

  if (!created) {
    throw new Error('Failed to create user');
  }

  return {
    id: created.userId,
    email: created.email,
    displayName: created.displayName ?? '',
    tenantId: created.tenantId,
    role: created.role,
    isActive: created.isActive,
  };
};

export const findUserByEmail = async (
  db: DB,
  email: string,
  tenantId: string,
): Promise<(AuthUser & { passwordHash: string }) | null> => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || user.tenantId !== tenantId) {
    return null;
  }

  return {
    id: user.userId,
    email: user.email,
    displayName: user.displayName ?? '',
    tenantId: user.tenantId,
    role: user.role,
    isActive: user.isActive,
    passwordHash: (user as unknown as { passwordHash: string }).passwordHash,
  };
};

export const findUserById = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<AuthUser | null> => {
  const user = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });

  if (!user || user.tenantId !== tenantId) {
    return null;
  }

  return {
    id: user.userId,
    email: user.email,
    displayName: user.displayName ?? '',
    tenantId: user.tenantId,
    role: user.role,
    isActive: user.isActive,
  };
};

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

  if (!session) {
    throw new Error('Failed to create session');
  }

  return session;
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
