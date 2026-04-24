import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../../shared/database/connection.js';
import {
  coopSession,
  type CoopSession,
  type CoopRole,
} from '../../../db/schema/multiplayer/index.js';
import { generateId } from '../../../shared/utils/id.js';

import {
  type PermissionMatrixConfig,
  createDefaultRoleConfig,
  mergePermissionMatrix,
  validatePermissionMatrix,
} from './permission-matrix.js';
import { createPermissionDeniedEvent } from './permission.enforcer.js';

import type { EventBus } from '../../../shared/events/event-types.js';
import type { AppConfig } from '../../../config.js';

export interface RoleConfigResult {
  success: boolean;
  config?: PermissionMatrixConfig;
  error?: string;
}

export interface RoleConfigOverrideInput {
  roles?: {
    [role: string]: {
      [phase: string]: readonly string[];
    };
  };
  authorityRole?: string;
}

export async function getSessionRoleConfig(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
): Promise<RoleConfigResult> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const roleConfig = (session as CoopSession & { roleConfig?: PermissionMatrixConfig }).roleConfig;

  if (!roleConfig) {
    return { success: true, config: createDefaultRoleConfig() };
  }

  if (!validatePermissionMatrix(roleConfig)) {
    return { success: true, config: createDefaultRoleConfig() };
  }

  return { success: true, config: roleConfig };
}

export async function setSessionRoleConfig(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  newConfig: PermissionMatrixConfig,
  _eventBus?: EventBus,
): Promise<RoleConfigResult> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const validatedConfig = validatePermissionMatrix(newConfig)
    ? newConfig
    : createDefaultRoleConfig();

  await db
    .update(coopSession)
    .set({ roleConfig: validatedConfig as unknown as Record<string, unknown> })
    .where(eq(coopSession.sessionId, sessionId));

  return { success: true, config: validatedConfig };
}

export async function overrideSessionRoleConfig(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  playerId: string,
  override: RoleConfigOverrideInput,
  eventBus?: EventBus,
): Promise<RoleConfigResult> {
  const currentResult = await getSessionRoleConfig(config, tenantId, sessionId);

  if (!currentResult.success || !currentResult.config) {
    return { success: false, error: currentResult.error ?? 'Failed to get current config' };
  }

  const overrideParams: Partial<PermissionMatrixConfig> = {};
  if (override.roles) {
    overrideParams.roles = override.roles;
  }
  if (override.authorityRole !== undefined) {
    overrideParams.authorityRole = override.authorityRole;
  }

  const mergedConfig = mergePermissionMatrix(currentResult.config, overrideParams);

  const result = await setSessionRoleConfig(config, tenantId, sessionId, mergedConfig, eventBus);

  if (result.success && eventBus) {
    const permissionDeniedEvent = createPermissionDeniedEvent({
      actorId: playerId,
      role: 'system',
      attemptedAction: 'role_config.override',
      phase: 'system',
      reason: 'CONFIG_OVERRIDE',
      sessionId,
      tenantId,
    });

    eventBus.publish({
      eventType: 'role.config.overridden',
      correlationId: generateId(),
      tenantId,
      userId: playerId,
      source: 'role-config',
      version: 1,
      payload: permissionDeniedEvent,
      eventId: generateId(),
      timestamp: new Date().toISOString(),
    });
  }

  return result;
}

export async function getRolePermissionsForSession(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  role: CoopRole,
): Promise<RoleConfigResult> {
  const result = await getSessionRoleConfig(config, tenantId, sessionId);

  if (!result.success || !result.config) {
    return result;
  }

  const rolePermissions = result.config.roles[role];

  if (!rolePermissions) {
    return {
      success: true,
      config: {
        ...result.config,
        roles: {
          ...result.config.roles,
          [role]: {},
        },
      },
    };
  }

  return result;
}
