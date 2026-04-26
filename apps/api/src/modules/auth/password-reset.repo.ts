import { eq, and, isNull } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import { passwordResetTokens } from '../../db/schema/auth/password-reset-tokens.js';
import { assertCreated } from '../../shared/utils/db-utils.js';

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

  return assertCreated(created, 'password reset token');
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
