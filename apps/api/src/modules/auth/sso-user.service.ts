import { eq, and } from 'drizzle-orm';

import type { SSOIdentityClaim } from '@the-dmz/shared/auth';

import { userSsoIdentities } from '../../db/schema/auth/user-sso-identities.js';
import { adminNotifications } from '../../db/schema/auth/admin-notifications.js';
import { users } from '../../shared/database/schema/users.js';
import { getDatabaseClient } from '../../shared/database/connection.js';

import type { SSOAccountLinkingResult } from './sso-shared.js';

const db = getDatabaseClient();

export const findUserBySSOIdentity = async (
  tenantId: string,
  providerId: string,
  subject: string,
): Promise<string | null> => {
  const result = await db
    .select()
    .from(userSsoIdentities)
    .where(
      and(
        eq(userSsoIdentities.tenantId, tenantId),
        eq(userSsoIdentities.ssoProviderId, providerId),
        eq(userSsoIdentities.subject, subject),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  return row ? row.userId : null;
};

export const findUserByEmail = async (
  tenantId: string,
  email: string,
): Promise<{ userId: string; tenantId: string; email: string; role: string } | null> => {
  const result = await db
    .select({
      userId: users.userId,
      tenantId: users.tenantId,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email.toLowerCase())))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    tenantId: row.tenantId,
    email: row.email,
    role: row.role,
  };
};

export const linkUserToSSOIdentity = async (
  userId: string,
  tenantId: string,
  providerId: string,
  subject: string,
  claims: SSOIdentityClaim,
): Promise<void> => {
  const emailLower = claims.email?.toLowerCase() ?? null;
  const displayNameVal = claims.displayName ?? null;
  const groupsJson = claims.groups ? JSON.stringify(claims.groups) : null;

  await db
    .insert(userSsoIdentities)
    .values({
      userId,
      tenantId,
      ssoProviderId: providerId,
      subject,
      email: emailLower,
      displayName: displayNameVal,
      groups: groupsJson,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
};

export interface CreateSSOUserInput {
  tenantId: string;
  email: string;
  displayName?: string;
  role?: string;
  isJitCreated?: boolean;
  idpSource?: 'saml' | 'oidc';
  department?: string;
  title?: string;
  managerEmail?: string;
  idpAttributes?: Record<string, unknown>;
}

export const createSSOUser = async (input: CreateSSOUserInput): Promise<string> => {
  const {
    tenantId,
    email,
    displayName,
    role = 'learner',
    isJitCreated = false,
    idpSource,
    department,
    title,
    idpAttributes,
  } = input;

  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      email: email.toLowerCase(),
      displayName: displayName ?? null,
      role,
      passwordHash: null,
      isActive: true,
      isJitCreated,
      idpSource: idpSource ?? null,
      department: department ?? null,
      title: title ?? null,
      idpAttributes: idpAttributes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ userId: users.userId });

  if (!user) {
    throw new Error('Failed to create SSO user');
  }

  return user.userId;
};

export interface NotifyJITUserCreatedOptions {
  tenantId: string;
  jitUserId: string;
  jitUserEmail: string;
  jitUserDisplayName?: string;
  idpSource: 'saml' | 'oidc';
  idpProviderName: string;
}

export const notifyJITUserCreated = async (options: NotifyJITUserCreatedOptions): Promise<void> => {
  const { tenantId, jitUserId, jitUserEmail, jitUserDisplayName, idpSource, idpProviderName } =
    options;

  const tenantAdmins = await db
    .select({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(
      and(eq(users.tenantId, tenantId), eq(users.role, 'tenant_admin'), eq(users.isActive, true)),
    );

  const notificationTitle = 'New JIT User Provisioned';
  const notificationMessage = `A new user "${jitUserDisplayName || jitUserEmail}" (${jitUserEmail}) was automatically provisioned via ${idpSource.toUpperCase()} provider "${idpProviderName}". Review the user and assign appropriate permissions.`;

  for (const admin of tenantAdmins) {
    console.warn(
      `[JIT Notification] Notifying tenant admin ${admin.email} about new JIT user: ${jitUserEmail} (${jitUserId}) from ${idpSource} provider "${idpProviderName}"`,
    );

    await db.insert(adminNotifications).values({
      tenantId,
      adminUserId: admin.userId,
      notificationType: 'jit_user_provisioned',
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        jitUserId,
        jitUserEmail,
        jitUserDisplayName,
        idpSource,
        idpProviderName,
      },
    });
  }
};

export const resolveSSOAccountLinking = async (
  tenantId: string,
  providerId: string,
  claims: SSOIdentityClaim,
  defaultRole: string,
  allowedRoles: string[],
): Promise<SSOAccountLinkingResult> => {
  if (!claims.email) {
    return { outcome: 'denied_no_email' };
  }

  const existingUserId = await findUserBySSOIdentity(tenantId, providerId, claims.subject);
  if (existingUserId) {
    return {
      outcome: 'linked_existing',
      userId: existingUserId,
      email: claims.email,
    };
  }

  const existingUserByEmail = await findUserByEmail(tenantId, claims.email);
  if (existingUserByEmail) {
    return {
      outcome: 'linked_existing',
      userId: existingUserByEmail.userId,
      email: claims.email,
    };
  }

  if (!allowedRoles.includes(defaultRole)) {
    return { outcome: 'denied_role_escalation' };
  }

  return {
    outcome: 'linked_new_jit',
    email: claims.email,
  };
};
