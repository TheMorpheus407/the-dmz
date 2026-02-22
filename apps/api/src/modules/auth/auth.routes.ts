import type { LoginInput, RegisterInput, RefreshTokenInput } from '@the-dmz/shared/schemas';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { preAuthTenantResolver } from '../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { requirePermission, resolvePermissions } from '../../shared/middleware/authorization.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import * as authService from './auth.service.js';
import { AuthError, InvalidCredentialsError } from './auth.errors.js';
import {
  createAuthUserCreatedEvent,
  createAuthSessionCreatedEvent,
  createAuthSessionRevokedEvent,
  createAuthLoginFailedEvent,
} from './auth.events.js';
import { validateCsrf, setCsrfCookie } from './csrf.js';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookieName } from './cookies.js';

import type { UpdateProfileData } from './auth.repo.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedUser } from './auth.types.js';

export const loginBodyJsonSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 12, maxLength: 128 },
  },
  required: ['email', 'password'],
  additionalProperties: false,
} as const;

export const registerBodyJsonSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 12, maxLength: 128 },
    displayName: { type: 'string', minLength: 2, maxLength: 64 },
  },
  required: ['email', 'password', 'displayName'],
  additionalProperties: false,
} as const;

export const refreshBodyJsonSchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string', minLength: 1 },
  },
  required: ['refreshToken'],
  additionalProperties: false,
} as const;

const authResponseJsonSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        displayName: { type: 'string' },
        tenantId: { type: 'string', format: 'uuid' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
      },
      required: ['id', 'email', 'displayName', 'tenantId', 'role', 'isActive'],
    },
    accessToken: { type: 'string' },
  },
  required: ['user', 'accessToken'],
} as const;

const refreshResponseJsonSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
  },
  required: ['accessToken'],
} as const;

const meResponseJsonSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        displayName: { type: 'string' },
        tenantId: { type: 'string', format: 'uuid' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
      },
      required: ['id', 'email', 'displayName', 'tenantId', 'role', 'isActive'],
    },
    profile: {
      type: 'object',
      properties: {
        profileId: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        locale: { type: 'string' },
        timezone: { type: 'string' },
        accessibilitySettings: { type: 'object' },
        notificationSettings: { type: 'object' },
      },
    },
    permissions: {
      type: 'array',
      items: { type: 'string' },
    },
    roles: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['user', 'permissions', 'roles'],
} as const;

const updateProfileBodyJsonSchema = {
  type: 'object',
  properties: {
    locale: { type: 'string', maxLength: 10 },
    timezone: { type: 'string', maxLength: 64 },
    accessibilitySettings: { type: 'object' },
    notificationSettings: { type: 'object' },
  },
  additionalProperties: false,
} as const;

const profileResponseJsonSchema = {
  type: 'object',
  properties: {
    profileId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    locale: { type: 'string' },
    timezone: { type: 'string' },
    accessibilitySettings: { type: 'object' },
    notificationSettings: { type: 'object' },
  },
  required: [
    'profileId',
    'tenantId',
    'userId',
    'locale',
    'timezone',
    'accessibilitySettings',
    'notificationSettings',
  ],
} as const;

export const authGuard = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  const config = request.server.config;

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError({
      message: 'Missing or invalid authorization header',
      statusCode: 401,
    });
  }

  const bearerValue = authHeader.substring(7);

  try {
    const user = await authService.verifyAccessToken(config, bearerValue);
    request.user = user;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError({
      message: 'Invalid or expired token',
      statusCode: 401,
    });
  }
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export const registerAuthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';
  const tenantResolverEnabled = config.TENANT_RESOLVER_ENABLED ?? false;

  const preAuthMiddleware = tenantResolverEnabled
    ? [preAuthTenantResolver(), preAuthTenantStatusGuard]
    : [];

  fastify.post<{ Body: RegisterInput }>(
    '/auth/register',
    {
      preHandler: preAuthMiddleware,
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 5,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: registerBodyJsonSchema,
        response: {
          201: authResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      const result = await authService.register(
        config,
        request.body,
        tenantId ? { tenantId } : undefined,
      );

      setCsrfCookie(request, reply);
      setRefreshCookie({ refreshToken: result.refreshToken, reply });

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.post<{ Body: LoginInput }>(
    '/auth/login',
    {
      preHandler: preAuthMiddleware,
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: loginBodyJsonSchema,
        response: {
          200: authResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      try {
        const result = await authService.login(
          config,
          request.body,
          tenantId ? { tenantId } : undefined,
        );

        setCsrfCookie(request, reply);
        setRefreshCookie({ refreshToken: result.refreshToken, reply });

        const eventBus = fastify.eventBus;
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
          const eventBus = fastify.eventBus;
          const defaultTenantId = 'default';
          eventBus.publish(
            createAuthLoginFailedEvent({
              source: 'auth-module',
              correlationId: request.id,
              tenantId: defaultTenantId,
              userId: '',
              version: 1,
              payload: {
                tenantId: defaultTenantId,
                email: request.body.email,
                reason: 'invalid_credentials',
                correlationId: request.id,
              },
            }),
          );
        }
        throw error;
      }
    },
  );

  fastify.post<{ Body: RefreshTokenInput }>(
    '/auth/refresh',
    {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      preHandler: validateCsrf,
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 20,
              timeWindow: '1 minute',
            },
      },
      schema: {
        response: {
          200: refreshResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
    },
    async (request, reply) => {
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

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.delete(
    '/auth/logout',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }, { cookieAuth: [] }, { csrfToken: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
            required: ['success'],
          },
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const refreshToken = request.cookies[getRefreshCookieName()];
      if (refreshToken) {
        await authService.logout(config, refreshToken);

        const eventBus = fastify.eventBus;
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
    },
  );

  fastify.get(
    '/auth/me',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: meResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const currentUser = await authService.getCurrentUser(config, user.userId, user.tenantId);
      const permissionContext = await resolvePermissions(config, user.tenantId, user.userId);
      const profile = await authService.getProfile(config, user.userId, user.tenantId);
      return {
        user: currentUser,
        profile: profile ?? undefined,
        permissions: permissionContext.permissions,
        roles: permissionContext.roles,
      };
    },
  );

  fastify.patch(
    '/auth/profile',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updateProfileBodyJsonSchema,
        response: {
          200: profileResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as UpdateProfileData;
      const profile = await authService.updateUserProfile(config, user.userId, user.tenantId, body);

      if (!profile) {
        throw new AuthError({
          message: 'Profile not found',
          statusCode: 404,
        });
      }

      return profile;
    },
  );

  fastify.get(
    '/health/authenticated',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      config: {
        rateLimit: false,
      },
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tenantId: { type: 'string' },
                  role: { type: 'string' },
                },
                required: ['id', 'tenantId', 'role'],
              },
            },
            required: ['status', 'user'],
          },
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      return {
        status: 'ok',
        user: {
          id: user.userId,
          tenantId: user.tenantId,
          role: user.role,
        },
      };
    },
  );

  fastify.get(
    '/auth/admin/users',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, requirePermission('admin', 'list')],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    displayName: { type: 'string' },
                    role: { type: 'string' },
                  },
                },
              },
            },
          },
          403: {
            oneOf: [errorResponseSchemas.Forbidden, errorResponseSchemas.TenantInactive],
          },
        },
      },
    },
    async (_request) => {
      return {
        users: [],
      };
    },
  );
};
