import { eq, and, sql, isNull, lt, desc } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
import { userProfiles } from '../../db/schema/auth/user-profiles.js';
import { passwordResetTokens } from '../../db/schema/auth/password-reset-tokens.js';
import { oauthClients } from '../../db/schema/auth/oauth-clients.js';

import { UserExistsError } from './auth.errors.js';

import type { AuthUser, AuthSession } from './auth.types.js';

export type ProfileData = {
  tenantId: string;
  userId: string;
  locale?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
};

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

export const createProfile = async (
  db: DB,
  data: ProfileData,
): Promise<{
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
}> => {
  const [created] = await db
    .insert(userProfiles)
    .values({
      tenantId: data.tenantId,
      userId: data.userId,
      locale: data.locale ?? 'en',
      timezone: data.timezone ?? 'UTC',
      accessibilitySettings: {
        ...(data.preferences?.['themePreferences'] ?? {}),
        ...(data.preferences?.['accessibilityPreferences'] ?? {}),
        ...(data.accessibilitySettings ?? {}),
      },
      notificationSettings: data.notificationSettings ?? {},
    })
    .returning({
      profileId: userProfiles.profileId,
      tenantId: userProfiles.tenantId,
      userId: userProfiles.userId,
      locale: userProfiles.locale,
      timezone: userProfiles.timezone,
      accessibilitySettings: userProfiles.accessibilitySettings,
      notificationSettings: userProfiles.notificationSettings,
    });

  if (!created) {
    throw new Error('Failed to create user profile');
  }

  return {
    profileId: created.profileId,
    tenantId: created.tenantId,
    userId: created.userId,
    locale: created.locale,
    timezone: created.timezone,
    preferences: data.preferences,
    policyLockedPreferences: data.policyLockedPreferences,
    accessibilitySettings: created.accessibilitySettings as Record<string, unknown>,
    notificationSettings: created.notificationSettings as Record<string, unknown>,
  } as unknown as {
    profileId: string;
    tenantId: string;
    userId: string;
    locale: string;
    timezone: string;
    preferences?: Record<string, unknown>;
    policyLockedPreferences?: Record<string, unknown>;
    accessibilitySettings: Record<string, unknown>;
    notificationSettings: Record<string, unknown>;
  };
};

export const findProfileByUserId = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<{
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
} | null> => {
  const profile = await db.query.userProfiles.findFirst({
    where: and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)),
  });

  if (!profile) {
    return null;
  }

  const accSettings = profile.accessibilitySettings as Record<string, unknown>;

  return {
    profileId: profile.profileId,
    tenantId: profile.tenantId,
    userId: profile.userId,
    locale: profile.locale,
    timezone: profile.timezone,
    preferences: {
      themePreferences: {
        theme: accSettings['theme'] as
          | 'green'
          | 'amber'
          | 'high-contrast'
          | 'enterprise'
          | undefined,
        enableTerminalEffects: accSettings['enableTerminalEffects'] as boolean | undefined,
        fontSize: accSettings['fontSize'] as number | undefined,
      },
      accessibilityPreferences: {
        reducedMotion: accSettings['reducedMotion'] as boolean | undefined,
        highContrast: accSettings['highContrast'] as boolean | undefined,
        fontSize: accSettings['fontSize'] as number | undefined,
      },
    } as Record<string, unknown>,
    policyLockedPreferences: undefined as unknown as Record<string, unknown>,
    accessibilitySettings: accSettings,
    notificationSettings: profile.notificationSettings as Record<string, unknown>,
  } as unknown as {
    profileId: string;
    tenantId: string;
    userId: string;
    locale: string;
    timezone: string;
    preferences?: Record<string, unknown>;
    policyLockedPreferences?: Record<string, unknown>;
    accessibilitySettings: Record<string, unknown>;
    notificationSettings: Record<string, unknown>;
  };
};

export type UpdateProfileData = {
  locale?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
  accessibilitySettings?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
};

export const updateProfile = async (
  db: DB,
  userId: string,
  tenantId: string,
  data: UpdateProfileData,
): Promise<{
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  preferences?: Record<string, unknown>;
  policyLockedPreferences?: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
} | null> => {
  const updates: Record<string, unknown> = {};

  if (data.locale !== undefined) {
    updates['locale'] = data.locale;
  }
  if (data.timezone !== undefined) {
    updates['timezone'] = data.timezone;
  }

  const existingProfile = await findProfileByUserId(db, userId, tenantId);

  if (data.preferences !== undefined) {
    const mergedSettings = {
      ...(existingProfile?.accessibilitySettings ?? {}),
      ...((data.preferences['themePreferences'] as Record<string, unknown>) ?? {}),
      ...((data.preferences['accessibilityPreferences'] as Record<string, unknown>) ?? {}),
    };
    updates['accessibilitySettings'] = mergedSettings;
  } else if (data.accessibilitySettings !== undefined) {
    const mergedSettings = {
      ...(existingProfile?.accessibilitySettings ?? {}),
      ...data.accessibilitySettings,
    };
    updates['accessibilitySettings'] = mergedSettings;
  }

  if (data.notificationSettings !== undefined) {
    updates['notificationSettings'] = data.notificationSettings;
  }

  if (Object.keys(updates).length === 0) {
    return findProfileByUserId(db, userId, tenantId);
  }

  const [updated] = await db
    .update(userProfiles)
    .set(updates)
    .where(and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)))
    .returning({
      profileId: userProfiles.profileId,
      tenantId: userProfiles.tenantId,
      userId: userProfiles.userId,
      locale: userProfiles.locale,
      timezone: userProfiles.timezone,
      accessibilitySettings: userProfiles.accessibilitySettings,
      notificationSettings: userProfiles.notificationSettings,
    });

  if (!updated) {
    return null;
  }

  return {
    profileId: updated.profileId,
    tenantId: updated.tenantId,
    userId: updated.userId,
    locale: updated.locale,
    timezone: updated.timezone,
    preferences: data.preferences,
    policyLockedPreferences: existingProfile?.policyLockedPreferences,
    accessibilitySettings: updated.accessibilitySettings as Record<string, unknown>,
    notificationSettings: updated.notificationSettings as Record<string, unknown>,
  } as unknown as {
    profileId: string;
    tenantId: string;
    userId: string;
    locale: string;
    timezone: string;
    preferences?: Record<string, unknown>;
    policyLockedPreferences?: Record<string, unknown>;
    accessibilitySettings: Record<string, unknown>;
    notificationSettings: Record<string, unknown>;
  };
};

export const backfillProfiles = async (db: DB): Promise<number> => {
  const result = await db.execute(sql`
    INSERT INTO "auth"."user_profiles" ("tenant_id", "user_id", "locale", "timezone", "accessibility_settings", "notification_settings")
    SELECT "tenant_id", "user_id", 'en', 'UTC', '{}', '{}'
    FROM "public"."users"
    WHERE NOT EXISTS (
      SELECT 1 FROM "auth"."user_profiles"
      WHERE "auth"."user_profiles"."tenant_id" = "public"."users"."tenant_id"
        AND "auth"."user_profiles"."user_id" = "public"."users"."user_id"
    )
    ON CONFLICT DO NOTHING
  `);
  const rowCount = (result as { rowCount?: number }).rowCount;
  return rowCount ?? 0;
};

export interface PasswordResetTokenRecord {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export const createPasswordResetToken = async (
  db: DB,
  data: {
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
  },
): Promise<PasswordResetTokenRecord> => {
  const hashCol = passwordResetTokens.tokenHash;
  const [created] = await db
    .insert(passwordResetTokens)
    .values({
      userId: data.userId,
      tenantId: data.tenantId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    })
    .returning({
      id: passwordResetTokens.id,
      tenantId: passwordResetTokens.tenantId,
      userId: passwordResetTokens.userId,
      tokenHash: hashCol,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
      createdAt: passwordResetTokens.createdAt,
    });

  if (!created) {
    throw new Error('Failed to create password reset token');
  }

  return created;
};

export const findValidPasswordResetToken = async (
  db: DB,
  tokenHash: string,
  tenantId: string,
): Promise<PasswordResetTokenRecord | null> => {
  const token = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      eq(passwordResetTokens.tenantId, tenantId),
      isNull(passwordResetTokens.usedAt),
    ),
  });

  if (!token) {
    return null;
  }

  if (new Date() > token.expiresAt) {
    return null;
  }

  return {
    id: token.id,
    tenantId: token.tenantId,
    userId: token.userId,
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    usedAt: token.usedAt,
    createdAt: token.createdAt,
  };
};

export const markPasswordResetTokenUsed = async (db: DB, tokenId: string): Promise<void> => {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
};

export const deleteAllPasswordResetTokensForUser = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<number> => {
  const deleted = await db
    .delete(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, userId), eq(passwordResetTokens.tenantId, tenantId)))
    .returning({ id: passwordResetTokens.id });
  return deleted.length;
};

export const findUserByEmailForPasswordReset = async (
  db: DB,
  email: string,
  tenantId: string,
): Promise<AuthUser | null> => {
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
  };
};

export const updateUserPassword = async (
  db: DB,
  userId: string,
  tenantId: string,
  passwordHash: string,
): Promise<void> => {
  await db
    .update(users)
    .set({ passwordHash })
    .where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));
};

export type OAuthClientData = {
  tenantId: string;
  name: string;
  secretHash: string;
  scopes: string;
  expiresAt: Date | null;
};

export const createOAuthClient = async (
  db: DB,
  data: OAuthClientData,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  scopes: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}> => {
  const [created] = await db
    .insert(oauthClients)
    .values({
      tenantId: data.tenantId,
      name: data.name,
      secretHash: data.secretHash,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
    })
    .returning({
      id: oauthClients.id,
      clientId: oauthClients.clientId,
      tenantId: oauthClients.tenantId,
      name: oauthClients.name,
      scopes: oauthClients.scopes,
      createdAt: oauthClients.createdAt,
      expiresAt: oauthClients.expiresAt,
      revokedAt: oauthClients.revokedAt,
      lastUsedAt: oauthClients.lastUsedAt,
    });

  if (!created) {
    throw new Error('Failed to create OAuth client');
  }

  return created;
};

export const findOAuthClientByClientIdOnly = async (
  db: DB,
  clientId: string,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  secretHash: string;
  previousSecretHash: string | null;
  scopes: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
} | null> => {
  const client = await db.query.oauthClients.findFirst({
    where: eq(oauthClients.clientId, clientId),
  });

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    clientId: client.clientId,
    tenantId: client.tenantId,
    name: client.name,
    secretHash: client.secretHash,
    previousSecretHash: client.previousSecretHash,
    scopes: client.scopes,
    expiresAt: client.expiresAt,
    revokedAt: client.revokedAt,
    lastUsedAt: client.lastUsedAt,
    createdAt: client.createdAt,
  };
};

export const findOAuthClientByClientId = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  secretHash: string;
  previousSecretHash: string | null;
  scopes: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
} | null> => {
  const client = await db.query.oauthClients.findFirst({
    where: and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)),
  });

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    clientId: client.clientId,
    tenantId: client.tenantId,
    name: client.name,
    secretHash: client.secretHash,
    previousSecretHash: client.previousSecretHash,
    scopes: client.scopes,
    expiresAt: client.expiresAt,
    revokedAt: client.revokedAt,
    lastUsedAt: client.lastUsedAt,
    createdAt: client.createdAt,
  };
};

export const findOAuthClientsByTenantId = async (
  db: DB,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    clientId: string;
    tenantId: string;
    name: string;
    scopes: string;
    createdAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
  }>
> => {
  return db.query.oauthClients.findMany({
    where: eq(oauthClients.tenantId, tenantId),
    columns: {
      id: true,
      clientId: true,
      tenantId: true,
      name: true,
      scopes: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
    },
  });
};

export const rotateOAuthClientSecret = async (
  db: DB,
  clientId: string,
  tenantId: string,
  newSecretHash: string,
): Promise<void> => {
  const client = await findOAuthClientByClientId(db, clientId, tenantId);
  if (!client) {
    throw new Error('OAuth client not found');
  }

  await db
    .update(oauthClients)
    .set({
      secretHash: newSecretHash,
      previousSecretHash: client.secretHash,
      updatedAt: new Date(),
    })
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};

export const revokeOAuthClient = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  await db
    .update(oauthClients)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};

export const updateOAuthClientLastUsed = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  await db
    .update(oauthClients)
    .set({
      lastUsedAt: new Date(),
    })
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};

export const deleteOAuthClient = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  await db
    .delete(oauthClients)
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};

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
