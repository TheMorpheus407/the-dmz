import type { LoginInput, RegisterInput, RefreshTokenInput } from '@the-dmz/shared/schemas';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { preAuthTenantResolver } from '../../shared/middleware/pre-auth-tenant-resolver.js';
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
    refreshToken: { type: 'string' },
  },
  required: ['user', 'accessToken', 'refreshToken'],
} as const;

const refreshResponseJsonSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
  },
  required: ['accessToken', 'refreshToken'],
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

  const preAuthMiddleware = tenantResolverEnabled ? [preAuthTenantResolver()] : [];

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
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      const result = await authService.register(
        config,
        request.body,
        tenantId ? { tenantId } : undefined,
      );

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
      return result;
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
        },
      },
    },
    async (request) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      try {
        const result = await authService.login(
          config,
          request.body,
          tenantId ? { tenantId } : undefined,
        );

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

        return result;
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
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 20,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: refreshBodyJsonSchema,
        response: {
          200: refreshResponseJsonSchema,
        },
      },
    },
    async (request) => {
      const result = await authService.refresh(config, request.body.refreshToken);

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

      return result;
    },
  );

  fastify.delete(
    '/auth/logout',
    {
      preHandler: [authGuard, tenantContext],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
            required: ['success'],
          },
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const refreshToken = (request.headers['x-refresh-token'] as string) || '';
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
      return { success: true };
    },
  );

  fastify.get(
    '/auth/me',
    {
      preHandler: [authGuard, tenantContext],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: meResponseJsonSchema,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const currentUser = await authService.getCurrentUser(config, user.userId, user.tenantId);
      const permissionContext = await resolvePermissions(config, user.tenantId, user.userId);
      return {
        user: currentUser,
        permissions: permissionContext.permissions,
        roles: permissionContext.roles,
      };
    },
  );

  fastify.get(
    '/health/authenticated',
    {
      preHandler: [authGuard, tenantContext],
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
      preHandler: [authGuard, tenantContext, requirePermission('admin', 'list')],
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
          403: errorResponseSchemas.Forbidden,
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
