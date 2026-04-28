import type { LoginInput, RegisterInput, RefreshTokenInput } from '@the-dmz/shared/schemas';

import { incrementAbuseCounter, resetAbuseCounters } from '../../shared/middleware/abuse-guard.js';
import { resolvePermissions } from '../../shared/middleware/authorization.js';

import * as authService from './auth.service.js';
import * as delegationService from './delegation.service.js';
import { AuthError, InvalidCredentialsError } from './auth.errors.js';
import {
  createAuthUserCreatedEvent,
  createAuthSessionCreatedEvent,
  createAuthSessionRevokedEvent,
  createAuthLoginFailedEvent,
  createAuthPasswordResetRequestedEvent,
  createAuthPasswordResetCompletedEvent,
  createOAuthClientCreatedEvent,
  createOAuthClientRotatedEvent,
  createOAuthClientRevokedEvent,
  createOAuthTokenIssuedEvent,
  createAuthSessionRevokedFederatedEvent,
  createAuthSessionRevokedAdminEvent,
  createAuthSessionRevokedUserAllEvent,
  createAuthSessionRevokedTenantAllEvent,
  createAuthDelegationRoleCreatedEvent,
  createAuthDelegationRoleUpdatedEvent,
  createAuthDelegationRoleAssignedEvent,
  createAuthDelegationDeniedEvent,
} from './auth.events.js';
import { setCsrfCookie } from './csrf.js';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookieName } from './cookies.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedUser } from './auth.types.js';
import type { UpdateProfileData } from './auth.repo.js';
import type { AppConfig } from '../../config.js';
import type { EventBus } from '../../shared/events/event-types.js';

export interface HandlerDeps {
  config: AppConfig;
  eventBus: EventBus;
}

export async function handleRegister(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply,
  deps: HandlerDeps,
): Promise<{ user: unknown; accessToken: string }> {
  const { config, eventBus } = deps;
  const tenantId = request.preAuthTenantContext?.tenantId;

  try {
    const result = await authService.register(
      config,
      request.body,
      tenantId ? { tenantId } : undefined,
    );

    await resetAbuseCounters(request, config);

    setCsrfCookie(request, reply);
    setRefreshCookie({ refreshToken: result.refreshToken, reply });

    eventBus.publish(
      createAuthUserCreatedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: result.user.tenantId,
        userId: result.user.id,
        version: 1,
        payload: {
          userId: result.user.id,
          email: result.user.email,
          tenantId: result.user.tenantId,
        },
      }),
    );

    eventBus.publish(
      createAuthSessionCreatedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: result.user.tenantId,
        userId: result.user.id,
        version: 1,
        payload: {
          sessionId: result.sessionId,
          userId: result.user.id,
          tenantId: result.user.tenantId,
        },
      }),
    );

    reply.code(201);
    return { user: result.user, accessToken: result.accessToken };
  } catch (error) {
    await incrementAbuseCounter(request, config);
    throw error;
  }
}

export async function handleLogin(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
  deps: HandlerDeps,
): Promise<{ user: unknown; accessToken: string }> {
  const { config, eventBus } = deps;
  const tenantId = request.preAuthTenantContext?.tenantId;
  const eventTenantId = tenantId ?? config.TENANT_FALLBACK_SLUG ?? '';

  try {
    const result = await authService.login(
      config,
      request.body,
      tenantId ? { tenantId } : undefined,
    );

    await resetAbuseCounters(request, config);

    setCsrfCookie(request, reply);
    setRefreshCookie({ refreshToken: result.refreshToken, reply });

    eventBus.publish(
      createAuthSessionCreatedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: result.user.tenantId,
        userId: result.user.id,
        version: 1,
        payload: {
          sessionId: result.sessionId,
          userId: result.user.id,
          tenantId: result.user.tenantId,
        },
      }),
    );

    return { user: result.user, accessToken: result.accessToken };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      await incrementAbuseCounter(request, config);

      eventBus.publish(
        createAuthLoginFailedEvent({
          source: 'auth-module',
          correlationId: request.id,
          tenantId: eventTenantId,
          userId: '',
          version: 1,
          payload: {
            tenantId: eventTenantId,
            email: request.body.email,
            reason: 'invalid_credentials',
            correlationId: request.id,
          },
        }),
      );
    }
    throw error;
  }
}

export async function handleRefresh(
  request: FastifyRequest<{ Body: RefreshTokenInput }>,
  reply: FastifyReply,
  deps: HandlerDeps,
): Promise<{ accessToken: string }> {
  const { config, eventBus } = deps;
  const refreshToken = request.cookies[getRefreshCookieName()];

  if (!refreshToken) {
    throw new AuthError({
      message: 'Refresh token not provided',
      statusCode: 401,
    });
  }

  const result = await authService.refresh(config, refreshToken);

  setCsrfCookie(request, reply);
  setRefreshCookie({ refreshToken: result.refreshToken, reply });

  eventBus.publish(
    createAuthSessionCreatedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: result.tenantId,
      userId: result.userId,
      version: 1,
      payload: {
        sessionId: result.sessionId,
        userId: result.userId,
        tenantId: result.tenantId,
      },
    }),
  );

  eventBus.publish(
    createAuthSessionRevokedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: result.tenantId,
      userId: result.userId,
      version: 1,
      payload: {
        sessionId: result.oldSessionId,
        userId: result.userId,
        tenantId: result.tenantId,
        reason: 'refresh_rotation',
      },
    }),
  );

  return { accessToken: result.accessToken };
}

export async function handleLogout(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: HandlerDeps,
): Promise<{ success: boolean }> {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const refreshToken = request.cookies[getRefreshCookieName()];
  if (refreshToken) {
    await authService.logout(config, refreshToken);

    eventBus.publish(
      createAuthSessionRevokedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: user.tenantId,
        userId: user.userId,
        version: 1,
        payload: {
          sessionId: user.sessionId,
          userId: user.userId,
          tenantId: user.tenantId,
          reason: 'logout',
        },
      }),
    );
  }
  clearRefreshCookie(reply);
  return { success: true };
}

export async function handleMe(request: FastifyRequest, deps: HandlerDeps) {
  const { config } = deps;
  const user = request.user as AuthenticatedUser;

  try {
    const currentUser = await authService.getCurrentUser(config, user.userId, user.tenantId);
    const permissionContext = await resolvePermissions(config, user.tenantId, user.userId);
    const { profile, effectivePreferences } = await authService.getEffectivePreferences(
      config,
      user.userId,
      user.tenantId,
    );

    return {
      user: currentUser,
      profile: profile
        ? {
            ...profile,
            preferences: profile.preferences,
            policyLockedPreferences: profile.policyLockedPreferences,
          }
        : undefined,
      effectivePreferences,
      permissions: permissionContext.permissions ?? [],
      roles: permissionContext.roles ?? [],
    };
  } catch (error) {
    request.log.error(
      { err: error, userId: user.userId, tenantId: user.tenantId },
      'auth/me handler failed',
    );
    throw new AuthError({
      message: 'Failed to retrieve user information',
      statusCode: 500,
    });
  }
}

export async function handleUpdateProfile(
  request: FastifyRequest<{ Body: UpdateProfileData }>,
  deps: HandlerDeps,
) {
  const { config } = deps;
  const user = request.user as AuthenticatedUser;
  const body = request.body;
  const profile = await authService.updateUserProfile(config, user.userId, user.tenantId, body);

  if (!profile) {
    throw new AuthError({
      message: 'Profile not found',
      statusCode: 404,
    });
  }

  return profile;
}

export async function handleHealthAuthenticated(request: FastifyRequest) {
  const user = request.user as AuthenticatedUser;
  return {
    status: 'ok',
    user: {
      id: user.userId,
      tenantId: user.tenantId,
      role: user.role,
    },
  };
}

export async function handleAdminUsersList() {
  return {
    users: [],
  };
}

export async function handlePasswordReset(
  request: FastifyRequest<{ Body: { email: string } }>,
  deps: HandlerDeps,
): Promise<{ success: boolean }> {
  const { config, eventBus } = deps;
  const tenantId = request.preAuthTenantContext?.tenantId;

  try {
    const result = await authService.requestPasswordReset(
      config,
      request.body,
      tenantId ? { tenantId } : undefined,
    );

    if (result.success) {
      eventBus.publish(
        createAuthPasswordResetRequestedEvent({
          source: 'auth-module',
          correlationId: request.id,
          tenantId: tenantId ?? '',
          userId: '',
          version: 1,
          payload: {
            userId: '',
            email: request.body.email,
            tenantId: tenantId ?? '',
          },
        }),
      );
    }

    return { success: true };
  } catch (error) {
    await incrementAbuseCounter(request, config);
    throw error;
  }
}

export async function handlePasswordChange(
  request: FastifyRequest<{ Body: { token: string; password: string } }>,
  deps: HandlerDeps,
): Promise<{ success: boolean; sessionsRevoked?: number }> {
  const { config, eventBus } = deps;
  const tenantId = request.preAuthTenantContext?.tenantId;

  try {
    const result = await authService.changePasswordWithToken(
      config,
      request.body,
      tenantId ? { tenantId } : undefined,
    );

    eventBus.publish(
      createAuthPasswordResetCompletedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: tenantId ?? '',
        userId: '',
        version: 1,
        payload: {
          userId: '',
          email: '',
          tenantId: tenantId ?? '',
          sessionsRevoked: result.sessionsRevoked ?? 0,
        },
      }),
    );

    return {
      success: result.success,
      sessionsRevoked: result.sessionsRevoked ?? 0,
    };
  } catch (error) {
    if (error instanceof InvalidCredentialsError === false) {
      await incrementAbuseCounter(request, config);
    }
    throw error;
  }
}

export async function handleOAuthToken(
  request: FastifyRequest<{
    Body: { grant_type: string; client_id: string; client_secret: string; scope?: string };
  }>,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const { grant_type, client_id, client_secret, scope } = request.body;

  if (grant_type !== 'client_credentials') {
    throw new AuthError({
      message: 'Invalid grant type',
      statusCode: 400,
    });
  }

  try {
    const client = await authService.findOAuthClientByClientIdOnly(config, client_id);
    if (!client) {
      throw new AuthError({
        message: 'Invalid client credentials',
        statusCode: 401,
      });
    }

    const tokenResponse = await authService.issueClientCredentialsToken(config, {
      clientId: client_id,
      clientSecret: client_secret,
      tenantId: client.tenantId,
      ...(scope && { scope }),
    });

    eventBus.publish(
      createOAuthTokenIssuedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: client.tenantId,
        version: 1,
        payload: {
          clientId: client_id,
          tenantId: client.tenantId,
          scopes: tokenResponse.scope.split(' '),
        },
      }),
    );

    return tokenResponse;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError({
      message: 'Invalid client credentials',
      statusCode: 401,
    });
  }
}

export async function handleOAuthClientsList(request: FastifyRequest, deps: HandlerDeps) {
  const { config } = deps;
  const user = request.user as AuthenticatedUser;
  const clients = await authService.listOAuthClients(config, user.tenantId);
  return { clients };
}

export async function handleOAuthClientCreate(
  request: FastifyRequest<{ Body: { name: string; scopes: string[] } }>,
  reply: FastifyReply,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const { name, scopes } = request.body;

  const result = await authService.createOAuthClient(config, {
    name,
    tenantId: user.tenantId,
    scopes,
  });

  eventBus.publish(
    createOAuthClientCreatedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: user.tenantId,
      version: 1,
      payload: {
        clientId: result.clientId,
        name: result.name,
        tenantId: result.tenantId,
        scopes: result.scopes,
      },
    }),
  );

  reply.code(201);
  return result;
}

export async function handleOAuthClientRotate(
  request: FastifyRequest<{ Params: { id: string } }>,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const { id } = request.params;

  const existingClient = await authService.findOAuthClientByClientIdOnly(config, id);
  if (!existingClient) {
    throw new AuthError({
      message: 'OAuth client not found',
      statusCode: 404,
    });
  }

  const result = await authService.rotateOAuthClientSecret(config, id, user.tenantId);

  eventBus.publish(
    createOAuthClientRotatedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: user.tenantId,
      version: 1,
      payload: {
        clientId: id,
        name: existingClient.name,
        tenantId: user.tenantId,
      },
    }),
  );

  return result;
}

export async function handleOAuthClientRevoke(
  request: FastifyRequest<{ Params: { id: string } }>,
  deps: HandlerDeps,
): Promise<{ success: boolean }> {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const { id } = request.params;

  const existingClient = await authService.findOAuthClientByClientIdOnly(config, id);
  if (!existingClient) {
    throw new AuthError({
      message: 'OAuth client not found',
      statusCode: 404,
    });
  }

  await authService.revokeOAuthClient(config, id, user.tenantId);

  eventBus.publish(
    createOAuthClientRevokedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: user.tenantId,
      version: 1,
      payload: {
        clientId: id,
        name: existingClient.name,
        tenantId: user.tenantId,
        reason: 'admin_revocation',
      },
    }),
  );

  return { success: true };
}

export async function handleOAuthClientDelete(
  request: FastifyRequest<{ Params: { id: string } }>,
  deps: HandlerDeps,
): Promise<{ success: boolean }> {
  const { config } = deps;
  const user = request.user as AuthenticatedUser;
  const { id } = request.params;

  await authService.deleteOAuthClient(config, id, user.tenantId);
  return { success: true };
}

export async function handleFederatedSessionRevoke(
  request: FastifyRequest<{
    Body: { userId?: string; email?: string; sourceType: string; ssoProviderId?: string };
  }>,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const { userId, email, sourceType, ssoProviderId } = request.body;

  const input = {
    tenantId: user.tenantId,
    ...(userId && { userId }),
    ...(email && { email }),
    sourceType: sourceType as 'saml' | 'oidc' | 'scim' | 'admin',
    ...(ssoProviderId && { ssoProviderId }),
  };

  const result = await authService.revokeUserSessionsByFederatedIdentity(config, input);

  if (result.result === 'revoked' && result.userId) {
    const payload: {
      sessionId: string;
      userId: string;
      tenantId: string;
      reason: 'saml_logout' | 'oidc_logout' | 'scim_deprovision';
      sourceType: 'saml' | 'oidc' | 'scim';
      correlationId: string;
      sessionsRevoked: number;
      ssoProviderId?: string;
    } = {
      sessionId: '',
      userId: result.userId,
      tenantId: user.tenantId,
      reason: `${sourceType}_logout` as 'saml_logout' | 'oidc_logout' | 'scim_deprovision',
      sourceType: sourceType as 'saml' | 'oidc' | 'scim',
      correlationId: request.id,
      sessionsRevoked: result.sessionsRevoked,
    };
    if (ssoProviderId) {
      payload.ssoProviderId = ssoProviderId;
    }

    eventBus.publish(
      createAuthSessionRevokedFederatedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: user.tenantId,
        userId: result.userId,
        version: 1,
        payload,
      }),
    );
  }

  return result;
}

export async function handleAdminSessionRevokeByUser(
  request: FastifyRequest<{ Params: { userId: string } }>,
  deps: HandlerDeps,
): Promise<{ sessionsRevoked: number }> {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const { userId } = request.params;

  const result = await authService.revokeUserSessionsByFederatedIdentity(config, {
    tenantId: user.tenantId,
    userId,
    sourceType: 'admin',
  });

  eventBus.publish(
    createAuthSessionRevokedFederatedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: user.tenantId,
      userId,
      version: 1,
      payload: {
        sessionId: '',
        userId,
        tenantId: user.tenantId,
        reason: 'saml_logout' as const,
        sourceType: 'saml' as const,
        correlationId: request.id,
        sessionsRevoked: result.sessionsRevoked,
      },
    }),
  );

  return { sessionsRevoked: result.sessionsRevoked };
}

export async function handleAdminSessionList(
  request: FastifyRequest<{
    Querystring: { userId?: string; status?: string; cursor?: string; limit?: number };
  }>,
  deps: HandlerDeps,
) {
  const { config } = deps;
  const user = request.user as AuthenticatedUser;
  const { userId, cursor, limit } = request.query;

  const serviceInput: {
    tenantId: string;
    userId?: string;
    cursor?: string;
    limit?: number;
  } = {
    tenantId: user.tenantId,
  };

  if (userId) {
    serviceInput.userId = userId;
  }
  if (cursor) {
    serviceInput.cursor = cursor;
  }
  if (limit) {
    serviceInput.limit = limit;
  }

  const sessions = await authService.listTenantSessions(config, serviceInput);

  return {
    sessions: sessions.sessions.map((s) => ({
      sessionId: s.sessionId,
      userId: s.userId,
      userEmail: s.userEmail,
      tenantId: s.tenantId,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
      expiresAt: s.expiresAt.toISOString(),
      deviceInfo: s.deviceInfo,
      status: s.status,
    })),
    nextCursor: sessions.nextCursor ?? undefined,
    total: sessions.total,
  };
}

export async function handleAdminSessionRevokeSingle(
  request: FastifyRequest<{ Params: { sessionId: string } }>,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const { sessionId } = request.params;

  const result = await authService.revokeSingleSession(config, {
    sessionId,
    tenantId: user.tenantId,
  });

  if (result.result === 'revoked') {
    eventBus.publish(
      createAuthSessionRevokedAdminEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: user.tenantId,
        userId: user.userId,
        version: 1,
        payload: {
          sessionId,
          userId: user.userId,
          tenantId: user.tenantId,
          reason: 'admin_revoked',
          initiatedBy: user.userId,
          correlationId: request.id,
        },
      }),
    );
  }

  return result;
}

export async function handleAdminSessionRevokeUserAll(
  request: FastifyRequest<{ Params: { userId: string } }>,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const { userId } = request.params;

  const result = await authService.revokeAllUserSessions(config, {
    userId,
    tenantId: user.tenantId,
    initiatedBy: user.userId,
  });

  if (result.result === 'revoked') {
    eventBus.publish(
      createAuthSessionRevokedUserAllEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: user.tenantId,
        userId,
        version: 1,
        payload: {
          userId,
          tenantId: user.tenantId,
          sessionsRevoked: result.sessionsRevoked,
          reason: 'admin_revoked',
          initiatedBy: user.userId,
          correlationId: request.id,
        },
      }),
    );
  }

  return result;
}

export async function handleAdminSessionRevokeTenantAll(
  request: FastifyRequest,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;

  const result = await authService.revokeAllTenantSessions(config, {
    tenantId: user.tenantId,
    initiatedBy: user.userId,
  });

  eventBus.publish(
    createAuthSessionRevokedTenantAllEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: user.tenantId,
      userId: user.userId,
      version: 1,
      payload: {
        tenantId: user.tenantId,
        sessionsRevoked: result.sessionsRevoked,
        reason: 'tenant_wide_admin_revocation',
        initiatedBy: user.userId,
        correlationId: request.id,
      },
    }),
  );

  return result;
}

export async function handleRolesList(request: FastifyRequest, deps: HandlerDeps) {
  const { config } = deps;
  const tenantContextVal = request.tenantContext;

  if (!tenantContextVal) {
    throw new AuthError({
      message: 'Tenant context required',
      statusCode: 400,
    });
  }

  const roles = await delegationService.listTenantRoles(config, tenantContextVal.tenantId);

  return roles;
}

export async function handleRoleDetails(
  request: FastifyRequest<{ Params: { roleId: string } }>,
  reply: FastifyReply,
  deps: HandlerDeps,
) {
  const { config } = deps;
  const tenantContextVal = request.tenantContext;
  const { roleId } = request.params;

  if (!tenantContextVal) {
    throw new AuthError({
      message: 'Tenant context required',
      statusCode: 400,
    });
  }

  const role = await delegationService.getRoleDetails(config, roleId, tenantContextVal.tenantId);

  if (!role) {
    reply.code(404);
    return { message: 'Role not found' };
  }

  return role;
}

export async function handleRoleCreate(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const tenantContextVal = request.tenantContext;
  const body = request.body as { name?: string; description?: string; permissions?: string[] };

  if (!tenantContextVal) {
    throw new AuthError({
      message: 'Tenant context required',
      statusCode: 400,
    });
  }

  if (!body.name || !body.permissions) {
    throw new AuthError({
      message: 'Role name and permissions are required',
      statusCode: 400,
    });
  }

  const createData: {
    actorId: string;
    actorTenantId: string;
    name: string;
    description?: string;
    permissions: string[];
  } = {
    actorId: user.userId,
    actorTenantId: tenantContextVal.tenantId,
    name: body.name,
    permissions: body.permissions,
  };

  if (body.description) {
    createData.description = body.description;
  }

  const result = await delegationService.createCustomRole(config, createData, {
    logger: request.log,
  });

  if (result.outcome !== 'allowed') {
    reply.code(403);

    eventBus.publish(
      createAuthDelegationDeniedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: tenantContextVal.tenantId,
        userId: user.userId,
        version: 1,
        payload: {
          actorId: user.userId,
          tenantId: tenantContextVal.tenantId,
          roleName: body.name,
          reason: result.reason ?? 'Permission ceiling exceeded',
          outcome: result.outcome,
          correlationId: request.id,
          ...(body.permissions && { permissions: body.permissions }),
        },
      }),
    );

    return {
      outcome: result.outcome,
      reason: result.reason,
    };
  }

  eventBus.publish(
    createAuthDelegationRoleCreatedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: tenantContextVal.tenantId,
      userId: user.userId,
      version: 1,
      payload: {
        actorId: user.userId,
        tenantId: tenantContextVal.tenantId,
        roleId: result.roleId!,
        roleName: body.name,
        permissions: body.permissions,
        correlationId: request.id,
      },
    }),
  );

  reply.code(201);
  return {
    outcome: result.outcome,
    roleId: result.roleId,
  };
}

export async function handleRoleAssign(
  request: FastifyRequest<{ Params: { roleId: string } }>,
  reply: FastifyReply,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const tenantContextVal = request.tenantContext;
  const { roleId } = request.params;
  const body = request.body as {
    targetUserId: string;
    scope?: string | null;
    expiresAt?: string | null;
  };

  if (!tenantContextVal) {
    throw new AuthError({
      message: 'Tenant context required',
      statusCode: 400,
    });
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const result = await delegationService.assignRoleToUser(
    config,
    {
      actorId: user.userId,
      actorTenantId: tenantContextVal.tenantId,
      targetUserId: body.targetUserId,
      targetRoleId: roleId,
      scope: body.scope ?? null,
      expiresAt,
    },
    {
      logger: request.log,
    },
  );

  if (result.outcome !== 'allowed') {
    reply.code(403);

    eventBus.publish(
      createAuthDelegationDeniedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: tenantContextVal.tenantId,
        userId: user.userId,
        version: 1,
        payload: {
          actorId: user.userId,
          tenantId: tenantContextVal.tenantId,
          targetUserId: body.targetUserId,
          roleId: roleId,
          reason: result.reason ?? 'Role assignment denied',
          outcome: result.outcome,
          correlationId: request.id,
        },
      }),
    );

    return {
      outcome: result.outcome,
      reason: result.reason,
    };
  }

  const roleDetails = await delegationService.getRoleDetails(
    config,
    roleId,
    tenantContextVal.tenantId,
  );

  eventBus.publish(
    createAuthDelegationRoleAssignedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: tenantContextVal.tenantId,
      userId: user.userId,
      version: 1,
      payload: {
        actorId: user.userId,
        tenantId: tenantContextVal.tenantId,
        targetUserId: body.targetUserId,
        roleId: roleId,
        roleName: roleDetails?.name ?? 'unknown',
        scope: body.scope ?? null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        correlationId: request.id,
      },
    }),
  );

  reply.code(201);
  return {
    outcome: result.outcome,
  };
}

export async function handleRoleUpdate(
  request: FastifyRequest<{ Params: { roleId: string } }>,
  reply: FastifyReply,
  deps: HandlerDeps,
) {
  const { config, eventBus } = deps;
  const user = request.user as AuthenticatedUser;
  const tenantContextVal = request.tenantContext;
  const { roleId } = request.params;
  const body = request.body as {
    name?: string;
    description?: string | null;
    permissions?: string[];
  };

  if (!tenantContextVal) {
    throw new AuthError({
      message: 'Tenant context required',
      statusCode: 400,
    });
  }

  if (!body.name && !body.description && !body.permissions) {
    throw new AuthError({
      message: 'At least one field (name, description, or permissions) is required',
      statusCode: 400,
    });
  }

  const updateData: {
    actorId: string;
    actorTenantId: string;
    roleId: string;
    name?: string;
    description?: string;
    permissions?: string[];
  } = {
    actorId: user.userId,
    actorTenantId: tenantContextVal.tenantId,
    roleId: roleId,
  };

  if (body.name) {
    updateData.name = body.name;
  }
  if (body.description) {
    updateData.description = body.description;
  }
  if (body.permissions) {
    updateData.permissions = body.permissions;
  }

  const result = await delegationService.updateCustomRole(config, updateData, {
    logger: request.log,
  });

  if (result.outcome !== 'allowed') {
    reply.code(403);

    const deniedPayload: {
      actorId: string;
      tenantId: string;
      roleId: string;
      permissions?: string[];
      reason: string;
      outcome: string;
      correlationId: string;
    } = {
      actorId: user.userId,
      tenantId: tenantContextVal.tenantId,
      roleId: roleId,
      reason: result.reason ?? 'Role update denied',
      outcome: result.outcome,
      correlationId: request.id,
    };
    if (body.permissions) {
      deniedPayload.permissions = body.permissions;
    }

    eventBus.publish(
      createAuthDelegationDeniedEvent({
        source: 'auth-module',
        correlationId: request.id,
        tenantId: tenantContextVal.tenantId,
        userId: user.userId,
        version: 1,
        payload: deniedPayload,
      }),
    );

    return {
      outcome: result.outcome,
      reason: result.reason,
    };
  }

  const roleDetails = await delegationService.getRoleDetails(
    config,
    roleId,
    tenantContextVal.tenantId,
  );

  eventBus.publish(
    createAuthDelegationRoleUpdatedEvent({
      source: 'auth-module',
      correlationId: request.id,
      tenantId: tenantContextVal.tenantId,
      userId: user.userId,
      version: 1,
      payload: {
        actorId: user.userId,
        tenantId: tenantContextVal.tenantId,
        roleId: roleId,
        roleName: roleDetails?.name ?? 'unknown',
        permissions: body.permissions ?? roleDetails?.permissions ?? [],
        correlationId: request.id,
      },
    }),
  );

  reply.code(200);
  return {
    outcome: result.outcome,
  };
}
