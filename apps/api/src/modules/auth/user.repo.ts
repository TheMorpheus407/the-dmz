import { eq, and } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';
import { assertCreated } from '../../shared/utils/db-utils.js';

import { UserExistsError } from './auth.errors.js';

import type { AuthUser } from './auth.types.js';

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

  const createdUser = assertCreated(created, 'user');

  return {
    id: createdUser.userId,
    email: createdUser.email,
    displayName: createdUser.displayName ?? '',
    tenantId: createdUser.tenantId,
    role: createdUser.role,
    isActive: createdUser.isActive,
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
