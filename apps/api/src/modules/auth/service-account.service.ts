import { randomUUID } from 'crypto';

import { eq, and, desc } from 'drizzle-orm';

import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

import { createAppError } from '../../shared/middleware/error-handler.js';
import { serviceAccounts } from '../../db/schema/auth/service-accounts.js';
import { serviceAccountRoles } from '../../db/schema/auth/service-account-roles.js';
import { apiKeys } from '../../db/schema/auth/api-keys.js';
import { roles } from '../../db/schema/auth/roles.js';
import { createAuditLog } from '../audit/index.js';

import type { DB } from '../../shared/database/connection.js';

export type ServiceAccountStatus = 'active' | 'disabled' | 'deleted';

export interface CreateServiceAccountInput {
  name: string;
  description?: string | undefined;
  ownerId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface UpdateServiceAccountInput {
  name?: string | undefined;
  description?: string | undefined;
  ownerId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ServiceAccountResponse {
  id: string;
  serviceId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: ServiceAccountStatus;
  ownerId: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  disabledAt: Date | null;
}

export interface ServiceAccountWithRoles extends ServiceAccountResponse {
  roles: Array<{
    id: string;
    roleId: string;
    roleName: string;
    assignedAt: Date;
    expiresAt: Date | null;
    scope: string | null;
  }>;
}

export interface AssignRoleToServiceAccountInput {
  roleId: string;
  expiresAt?: Date | undefined;
  scope?: string | undefined;
  assignedBy: string;
}

async function createServiceAccount(
  db: DB,
  input: CreateServiceAccountInput,
  createdBy: string,
  tenantId: string,
): Promise<ServiceAccountResponse> {
  const serviceId = randomUUID();

  const [created] = await db
    .insert(serviceAccounts)
    .values({
      serviceId,
      tenantId,
      name: input.name,
      description: input.description ?? null,
      ownerId: input.ownerId ?? null,
      metadata: input.metadata ?? null,
      status: 'active',
      createdBy,
    })
    .returning();

  if (!created) {
    throw createAppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create service account');
  }

  await createAuditLog({
    tenantId,
    userId: createdBy,
    action: 'service_account_created',
    resourceType: 'service_account',
    resourceId: created.serviceId,
    metadata: {
      name: input.name,
      description: input.description ?? null,
      ownerId: input.ownerId ?? null,
    },
  });

  return mapDbToResponse(created);
}

async function listServiceAccounts(
  db: DB,
  tenantId: string,
  options?: {
    cursor?: string;
    limit?: number;
    status?: ServiceAccountStatus;
  },
): Promise<{ accounts: ServiceAccountResponse[]; total: number; cursor?: string }> {
  const limit = options?.limit ?? 20;

  const conditions = [eq(serviceAccounts.tenantId, tenantId)];

  if (options?.status) {
    conditions.push(eq(serviceAccounts.status, options.status));
  }

  const accounts = await db
    .select()
    .from(serviceAccounts)
    .where(and(...conditions))
    .orderBy(desc(serviceAccounts.createdAt))
    .limit(limit + 1);

  let cursor: string | undefined;
  if (accounts.length > limit) {
    const lastAccount = accounts[limit];
    if (lastAccount) {
      cursor = lastAccount.serviceId;
      accounts.pop();
    }
  }

  const response: { accounts: ServiceAccountResponse[]; total: number; cursor?: string } = {
    accounts: accounts.map(mapDbToResponse),
    total: accounts.length,
  };
  if (cursor) {
    response.cursor = cursor;
  }
  return response;
}

async function getServiceAccountById(
  db: DB,
  serviceId: string,
  tenantId: string,
): Promise<ServiceAccountResponse | null> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  return account ? mapDbToResponse(account) : null;
}

async function getServiceAccountByIdForAdmin(
  db: DB,
  serviceId: string,
): Promise<ServiceAccountResponse | null> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(eq(serviceAccounts.serviceId, serviceId));

  return account ? mapDbToResponse(account) : null;
}

async function updateServiceAccount(
  db: DB,
  serviceId: string,
  input: UpdateServiceAccountInput,
  tenantId: string,
  performedBy?: string,
): Promise<ServiceAccountResponse> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  const [updated] = await db
    .update(serviceAccounts)
    .set({
      name: input.name ?? account.name,
      description: input.description !== undefined ? input.description : account.description,
      ownerId: input.ownerId !== undefined ? input.ownerId : account.ownerId,
      metadata: input.metadata !== undefined ? input.metadata : account.metadata,
      updatedAt: new Date(),
    })
    .where(and(eq(serviceAccounts.id, account.id), eq(serviceAccounts.tenantId, tenantId)))
    .returning();

  if (!updated) {
    throw createAppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update service account');
  }

  if (performedBy) {
    await createAuditLog({
      tenantId,
      userId: performedBy,
      action: 'service_account_updated',
      resourceType: 'service_account',
      resourceId: serviceId,
      metadata: {
        changes: {
          name: input.name !== undefined ? input.name : null,
          description: input.description !== undefined ? input.description : null,
          ownerId: input.ownerId !== undefined ? input.ownerId : null,
          metadata: input.metadata !== undefined ? input.metadata : null,
        },
      },
    });
  }

  return mapDbToResponse(updated);
}

async function disableServiceAccount(
  db: DB,
  serviceId: string,
  tenantId: string,
  performedBy?: string,
): Promise<ServiceAccountResponse> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  if (account.status === 'disabled') {
    return mapDbToResponse(account);
  }

  const [updated] = await db
    .update(serviceAccounts)
    .set({
      status: 'disabled',
      disabledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(serviceAccounts.id, account.id), eq(serviceAccounts.tenantId, tenantId)))
    .returning();

  if (!updated) {
    throw createAppError(ErrorCodes.INTERNAL_ERROR, 'Failed to disable service account');
  }

  if (performedBy) {
    await createAuditLog({
      tenantId,
      userId: performedBy,
      action: 'service_account_disabled',
      resourceType: 'service_account',
      resourceId: serviceId,
    });
  }

  return mapDbToResponse(updated);
}

async function enableServiceAccount(
  db: DB,
  serviceId: string,
  tenantId: string,
  performedBy?: string,
): Promise<ServiceAccountResponse> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  if (account.status === 'active') {
    return mapDbToResponse(account);
  }

  const [updated] = await db
    .update(serviceAccounts)
    .set({
      status: 'active',
      disabledAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(serviceAccounts.id, account.id), eq(serviceAccounts.tenantId, tenantId)))
    .returning();

  if (!updated) {
    throw createAppError(ErrorCodes.INTERNAL_ERROR, 'Failed to enable service account');
  }

  if (performedBy) {
    await createAuditLog({
      tenantId,
      userId: performedBy,
      action: 'service_account_enabled',
      resourceType: 'service_account',
      resourceId: serviceId,
    });
  }

  return mapDbToResponse(updated);
}

async function deleteServiceAccount(
  db: DB,
  serviceId: string,
  tenantId: string,
  performedBy?: string,
): Promise<void> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  await db
    .update(serviceAccounts)
    .set({
      status: 'deleted',
      updatedAt: new Date(),
    })
    .where(and(eq(serviceAccounts.id, account.id), eq(serviceAccounts.tenantId, tenantId)));

  if (performedBy) {
    await createAuditLog({
      tenantId,
      userId: performedBy,
      action: 'service_account_deleted',
      resourceType: 'service_account',
      resourceId: serviceId,
    });
  }
}

async function assignRoleToServiceAccount(
  db: DB,
  serviceId: string,
  input: AssignRoleToServiceAccountInput,
  tenantId: string,
): Promise<void> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.id, input.roleId)));

  if (!role) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Role not found');
  }

  const existingAssignment = await db
    .select()
    .from(serviceAccountRoles)
    .where(
      and(
        eq(serviceAccountRoles.tenantId, tenantId),
        eq(serviceAccountRoles.serviceAccountId, account.id),
        eq(serviceAccountRoles.roleId, input.roleId),
      ),
    )
    .limit(1);

  if (existingAssignment.length > 0) {
    throw createAppError(ErrorCodes.CONFLICT, 'Service account already has this role');
  }

  await db.insert(serviceAccountRoles).values({
    tenantId,
    serviceAccountId: account.id,
    roleId: input.roleId,
    assignedBy: input.assignedBy,
    expiresAt: input.expiresAt ?? null,
    scope: input.scope ?? null,
  });

  await createAuditLog({
    tenantId,
    userId: input.assignedBy,
    action: 'service_account_role_assigned',
    resourceType: 'service_account',
    resourceId: serviceId,
    metadata: {
      roleId: input.roleId,
      roleName: role.name,
      scope: input.scope ?? null,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    },
  });
}

async function revokeRoleFromServiceAccount(
  db: DB,
  serviceId: string,
  roleId: string,
  tenantId: string,
  performedBy?: string,
): Promise<void> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  const [assignment] = await db
    .select()
    .from(serviceAccountRoles)
    .where(
      and(
        eq(serviceAccountRoles.tenantId, tenantId),
        eq(serviceAccountRoles.serviceAccountId, account.id),
        eq(serviceAccountRoles.roleId, roleId),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Role assignment not found');
  }

  await db.delete(serviceAccountRoles).where(eq(serviceAccountRoles.id, assignment.id));

  if (performedBy) {
    await createAuditLog({
      tenantId,
      userId: performedBy,
      action: 'service_account_role_revoked',
      resourceType: 'service_account',
      resourceId: serviceId,
      metadata: {
        roleId,
        previousAssignmentId: assignment.id,
      },
    });
  }
}

async function getServiceAccountRoles(
  db: DB,
  serviceId: string,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    roleId: string;
    roleName: string;
    assignedAt: Date;
    expiresAt: Date | null;
    scope: string | null;
  }>
> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  const assignments = await db
    .select({
      id: serviceAccountRoles.id,
      roleId: serviceAccountRoles.roleId,
      roleName: roles.name,
      assignedAt: serviceAccountRoles.assignedAt,
      expiresAt: serviceAccountRoles.expiresAt,
      scope: serviceAccountRoles.scope,
    })
    .from(serviceAccountRoles)
    .leftJoin(roles, and(eq(roles.id, serviceAccountRoles.roleId), eq(roles.tenantId, tenantId)))
    .where(
      and(
        eq(serviceAccountRoles.serviceAccountId, account.id),
        eq(serviceAccountRoles.tenantId, tenantId),
      ),
    );

  return assignments.map((a) => ({
    id: a.id,
    roleId: a.roleId,
    roleName: a.roleName ?? '',
    assignedAt: a.assignedAt,
    expiresAt: a.expiresAt,
    scope: a.scope,
  }));
}

async function getServiceAccountApiKeys(
  db: DB,
  serviceId: string,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    keyId: string;
    name: string;
    status: string;
    createdAt: Date;
  }>
> {
  const [account] = await db
    .select()
    .from(serviceAccounts)
    .where(and(eq(serviceAccounts.serviceId, serviceId), eq(serviceAccounts.tenantId, tenantId)));

  if (!account) {
    throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      keyId: apiKeys.keyId,
      name: apiKeys.name,
      status: apiKeys.status,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.serviceAccountId, account.id));

  return keys;
}

interface DbServiceAccount {
  id: string;
  serviceId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  ownerId: string | null;
  metadata: unknown;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  disabledAt: Date | null;
}

function mapDbToResponse(account: DbServiceAccount): ServiceAccountResponse {
  return {
    id: account.id,
    serviceId: account.serviceId,
    tenantId: account.tenantId,
    name: account.name,
    description: account.description,
    status: account.status as ServiceAccountStatus,
    ownerId: account.ownerId,
    metadata:
      typeof account.metadata === 'string'
        ? (JSON.parse(account.metadata) as Record<string, unknown>)
        : (account.metadata as Record<string, unknown>),
    createdBy: account.createdBy,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    disabledAt: account.disabledAt,
  };
}

export const serviceAccountService = {
  createServiceAccount,
  listServiceAccounts,
  getServiceAccountById,
  getServiceAccountByIdForAdmin,
  updateServiceAccount,
  disableServiceAccount,
  enableServiceAccount,
  deleteServiceAccount,
  assignRoleToServiceAccount,
  revokeRoleFromServiceAccount,
  getServiceAccountRoles,
  getServiceAccountApiKeys,
};
