import type { LoginInput, RegisterInput, RefreshTokenInput } from '@the-dmz/shared/schemas';

import * as authService from './auth.service.js';
import { AuthError } from './auth.errors.js';

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
  },
  required: ['user'],
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

  const token = authHeader.substring(7);

  try {
    const user = await authService.verifyAccessToken(config, token);
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

  fastify.post<{ Body: RegisterInput }>(
    '/auth/register',
    {
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
      const result = await authService.register(config, request.body);
      reply.code(201);
      return result;
    },
  );

  fastify.post<{ Body: LoginInput }>(
    '/auth/login',
    {
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
      return authService.login(config, request.body);
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
      return authService.refresh(config, request.body.refreshToken);
    },
  );

  fastify.delete(
    '/auth/logout',
    {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      preHandler: authGuard,
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
      const refreshToken = (request.headers['x-refresh-token'] as string) || '';
      if (refreshToken) {
        await authService.logout(config, refreshToken);
      }
      return { success: true };
    },
  );

  fastify.get(
    '/auth/me',
    {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      preHandler: authGuard,
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
      return { user: currentUser };
    },
  );

  fastify.get(
    '/health/authenticated',
    {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      preHandler: authGuard,
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
};
