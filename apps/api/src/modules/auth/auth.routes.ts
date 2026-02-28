import type { LoginInput, RegisterInput, RefreshTokenInput } from '@the-dmz/shared/schemas';
import {
  loginJsonSchema,
  registerJsonSchema,
  refreshTokenJsonSchema,
  loginResponseJsonSchema,
  profileJsonSchema,
  updateProfileJsonSchema,
  refreshResponseJsonSchema as sharedRefreshResponseJsonSchema,
  meResponseJsonSchema as sharedMeResponseJsonSchema,
  effectivePreferencesJsonSchema,
  passwordResetRequestJsonSchema,
  passwordResetRequestResponseJsonSchema,
  passwordChangeRequestJsonSchema,
  passwordChangeRequestResponseJsonSchema,
} from '@the-dmz/shared/schemas';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { preAuthTenantResolver } from '../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { requirePermission, resolvePermissions } from '../../shared/middleware/authorization.js';
import { requireMfaForSuperAdmin } from '../../shared/middleware/mfa-guard.js';
import { idempotency } from '../../shared/middleware/idempotency.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { getAbuseCounterService } from '../../shared/services/abuse-counter.service.js';
import {
  evaluateAbuseResult,
  setAbuseHeaders,
  getClientIp,
} from '../../shared/policies/auth-abuse-policy.js';

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
import { validateCsrf, setCsrfCookie } from './csrf.js';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookieName } from './cookies.js';

import type { UpdateProfileData } from './auth.repo.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedUser } from './auth.types.js';

export const loginBodyJsonSchema = loginJsonSchema;

export const registerBodyJsonSchema = registerJsonSchema;

export const refreshBodyJsonSchema = refreshTokenJsonSchema;

export const authResponseJsonSchema = loginResponseJsonSchema;

export const refreshResponseJsonSchema = sharedRefreshResponseJsonSchema;

export const meResponseJsonSchema = {
  ...sharedMeResponseJsonSchema,
  properties: {
    ...sharedMeResponseJsonSchema.properties,
    permissions: {
      type: 'array',
      items: { type: 'string' },
    },
    roles: {
      type: 'array',
      items: { type: 'string' },
    },
    effectivePreferences: effectivePreferencesJsonSchema,
  },
  required: [...(sharedMeResponseJsonSchema.required || []), 'permissions', 'roles'],
} as const;

export const updateProfileBodyJsonSchema = updateProfileJsonSchema;

export const profileResponseJsonSchema = profileJsonSchema;

export const passwordResetRequestBodyJsonSchema = passwordResetRequestJsonSchema;

export const passwordChangeRequestBodyJsonSchema = passwordChangeRequestJsonSchema;

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
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [
              errorResponseSchemas.TenantInactive,
              errorResponseSchemas.AbuseLocked,
              errorResponseSchemas.AbuseChallengeRequired,
              errorResponseSchemas.AbuseIpBlocked,
            ],
          },
          409: errorResponseSchemas.Conflict,
          429: {
            oneOf: [errorResponseSchemas.RateLimitExceeded, errorResponseSchemas.AbuseCooldown],
          },
          500: errorResponseSchemas.InternalServerError,
        },
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      const clientIp = getClientIp(request);

      const abuseService = getAbuseCounterService(config);

      const registerAbuseOptions: {
        tenantId?: string;
        email: string;
        ip?: string;
        category: 'register';
      } = {
        email: request.body.email,
        category: 'register',
      };
      if (tenantId) {
        registerAbuseOptions.tenantId = tenantId;
      }
      if (clientIp) {
        registerAbuseOptions.ip = clientIp;
      }

      const preAuthAbuse = await abuseService.checkAbuseLevel(registerAbuseOptions);

      evaluateAbuseResult(preAuthAbuse);
      setAbuseHeaders(reply, preAuthAbuse);

      try {
        const result = await authService.register(
          config,
          request.body,
          tenantId ? { tenantId } : undefined,
        );

        await abuseService.resetCounters(registerAbuseOptions);

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
      } catch (error) {
        await abuseService.incrementAndEvaluate(registerAbuseOptions);
        throw error;
      }
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
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: {
            oneOf: [
              errorResponseSchemas.TenantInactive,
              errorResponseSchemas.AbuseLocked,
              errorResponseSchemas.AbuseChallengeRequired,
              errorResponseSchemas.AbuseIpBlocked,
            ],
          },
          429: {
            oneOf: [errorResponseSchemas.RateLimitExceeded, errorResponseSchemas.AbuseCooldown],
          },
          500: errorResponseSchemas.InternalServerError,
        },
        security: [{ cookieAuth: [] }],
      },
    },
    async (request, reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      const clientIp = getClientIp(request);
      const eventTenantId = tenantId ?? '';

      const abuseService = getAbuseCounterService(config);

      const abuseCheckOptions: {
        tenantId?: string;
        email: string;
        ip?: string;
        category: 'login' | 'register';
      } = {
        email: request.body.email,
        category: 'login',
      };
      if (tenantId) {
        abuseCheckOptions.tenantId = tenantId;
      }
      if (clientIp) {
        abuseCheckOptions.ip = clientIp;
      }

      const preAuthAbuse = await abuseService.checkAbuseLevel(abuseCheckOptions);

      evaluateAbuseResult(preAuthAbuse);
      setAbuseHeaders(reply, preAuthAbuse);

      try {
        const result = await authService.login(
          config,
          request.body,
          tenantId ? { tenantId } : undefined,
        );

        await abuseService.resetCounters(abuseCheckOptions);

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
          const postAuthAbuse = await abuseService.incrementAndEvaluate(abuseCheckOptions);

          evaluateAbuseResult(postAuthAbuse);
          setAbuseHeaders(reply, postAuthAbuse);

          const eventBus = fastify.eventBus;
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
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
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
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
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
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
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
        permissions: permissionContext.permissions,
        roles: permissionContext.roles,
      };
    },
  );

  fastify.patch(
    '/auth/profile',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, idempotency],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updateProfileBodyJsonSchema,
        response: {
          200: profileResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
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
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
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
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'list'),
        requireMfaForSuperAdmin,
      ],
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
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (_request) => {
      return {
        users: [],
      };
    },
  );

  fastify.post<{ Body: { email: string } }>(
    '/auth/password/reset',
    {
      preHandler: preAuthMiddleware,
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 3,
              timeWindow: '1 hour',
            },
      },
      schema: {
        body: passwordResetRequestBodyJsonSchema,
        response: {
          200: passwordResetRequestResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [
              errorResponseSchemas.TenantInactive,
              errorResponseSchemas.AbuseLocked,
              errorResponseSchemas.AbuseChallengeRequired,
              errorResponseSchemas.AbuseIpBlocked,
            ],
          },
          429: {
            oneOf: [
              errorResponseSchemas.RateLimitExceeded,
              errorResponseSchemas.AbuseCooldown,
              errorResponseSchemas.PasswordResetRateLimited,
            ],
          },
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      const clientIp = getClientIp(request);

      const abuseService = getAbuseCounterService(config);

      const abuseCheckOptions: {
        tenantId?: string;
        email: string;
        ip?: string;
        category: 'password_reset';
      } = {
        email: request.body.email,
        category: 'password_reset',
      };
      if (tenantId) {
        abuseCheckOptions.tenantId = tenantId;
      }
      if (clientIp) {
        abuseCheckOptions.ip = clientIp;
      }

      const preAuthAbuse = await abuseService.checkAbuseLevel(abuseCheckOptions);

      evaluateAbuseResult(preAuthAbuse);
      setAbuseHeaders(reply, preAuthAbuse);

      try {
        const result = await authService.requestPasswordReset(
          config,
          request.body,
          tenantId ? { tenantId } : undefined,
        );

        const eventBus = fastify.eventBus;
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
        await abuseService.incrementAndEvaluate(abuseCheckOptions);
        throw error;
      }
    },
  );

  fastify.post<{ Body: { token: string; password: string } }>(
    '/auth/password/change',
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
        body: passwordChangeRequestBodyJsonSchema,
        response: {
          200: passwordChangeRequestResponseJsonSchema,
          400: {
            oneOf: [
              errorResponseSchemas.BadRequest,
              errorResponseSchemas.PasswordPolicyError,
              errorResponseSchemas.PasswordResetTokenExpired,
              errorResponseSchemas.PasswordResetTokenInvalid,
              errorResponseSchemas.PasswordResetTokenAlreadyUsed,
            ],
          },
          403: {
            oneOf: [
              errorResponseSchemas.TenantInactive,
              errorResponseSchemas.AbuseLocked,
              errorResponseSchemas.AbuseChallengeRequired,
              errorResponseSchemas.AbuseIpBlocked,
            ],
          },
          429: {
            oneOf: [errorResponseSchemas.RateLimitExceeded, errorResponseSchemas.AbuseCooldown],
          },
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      const clientIp = getClientIp(request);

      const abuseService = getAbuseCounterService(config);

      const abuseCheckOptions: {
        tenantId?: string;
        ip?: string;
        category: 'password_change';
      } = {
        category: 'password_change',
      };
      if (tenantId) {
        abuseCheckOptions.tenantId = tenantId;
      }
      if (clientIp) {
        abuseCheckOptions.ip = clientIp;
      }

      const preAuthAbuse = await abuseService.checkAbuseLevel(abuseCheckOptions);

      evaluateAbuseResult(preAuthAbuse);
      setAbuseHeaders(reply, preAuthAbuse);

      try {
        const result = await authService.changePasswordWithToken(
          config,
          request.body,
          tenantId ? { tenantId } : undefined,
        );

        const eventBus = fastify.eventBus;
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
          sessionsRevoked: result.sessionsRevoked,
        };
      } catch (error) {
        if (error instanceof InvalidCredentialsError === false) {
          await abuseService.incrementAndEvaluate(abuseCheckOptions);
        }
        throw error;
      }
    },
  );

  fastify.post<{
    Body: { grant_type: string; client_id: string; client_secret: string; scope?: string };
  }>(
    '/auth/oauth/token',
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
        body: {
          type: 'object',
          required: ['grant_type', 'client_id', 'client_secret'],
          properties: {
            grant_type: { type: 'string', enum: ['client_credentials'] },
            client_id: { type: 'string', format: 'uuid' },
            client_secret: { type: 'string', minLength: 1 },
            scope: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              token_type: { type: 'string', enum: ['Bearer'] },
              expires_in: { type: 'integer' },
              scope: { type: 'string' },
            },
            required: ['access_token', 'token_type', 'expires_in', 'scope'],
          },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
        },
      },
    },
    async (request, _reply) => {
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

        const eventBus = fastify.eventBus;
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
      } catch (err) {
        if (err instanceof AuthError) {
          throw err;
        }
        throw new AuthError({
          message: 'Invalid client credentials',
          statusCode: 401,
        });
      }
    },
  );

  fastify.get(
    '/auth/oauth/clients',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              clients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    clientId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    tenantId: { type: 'string', format: 'uuid' },
                    scopes: { type: 'array', items: { type: 'string' } },
                    createdAt: { type: 'string', format: 'date-time' },
                    expiresAt: { type: 'string', format: 'date-time', nullable: true },
                    revokedAt: { type: 'string', format: 'date-time', nullable: true },
                    lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
            },
          },
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const clients = await authService.listOAuthClients(config, user.tenantId);
      return { clients };
    },
  );

  fastify.post<{ Body: { name: string; scopes: string[] } }>(
    '/auth/oauth/clients',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'scopes'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            scopes: {
              type: 'array',
              items: { type: 'string', enum: ['scim.read', 'scim.write'] },
              minItems: 1,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              clientId: { type: 'string', format: 'uuid' },
              clientSecret: { type: 'string' },
              name: { type: 'string' },
              tenantId: { type: 'string', format: 'uuid' },
              scopes: { type: 'array', items: { type: 'string' } },
              expiresAt: { type: 'string', format: 'date-time', nullable: true },
            },
            required: ['clientId', 'clientSecret', 'name', 'tenantId', 'scopes', 'expiresAt'],
          },
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { name, scopes } = request.body;

      const result = await authService.createOAuthClient(config, {
        name,
        tenantId: user.tenantId,
        scopes,
      });

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id/rotate',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              clientSecret: { type: 'string' },
            },
            required: ['clientSecret'],
          },
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
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

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id/revoke',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
            required: ['success'],
          },
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
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

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
            required: ['success'],
          },
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      await authService.deleteOAuthClient(config, id, user.tenantId);
      return { success: true };
    },
  );

  const federatedRevocationBodyJsonSchema = {
    type: 'object',
    properties: {
      userId: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      sourceType: { type: 'string', enum: ['saml', 'oidc', 'scim'] },
      ssoProviderId: { type: 'string' },
    },
    required: ['sourceType'],
  };

  fastify.post<{
    Body: { userId?: string; email?: string; sourceType: string; ssoProviderId?: string };
  }>(
    '/auth/admin/sessions/revoke',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: federatedRevocationBodyJsonSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              result: {
                type: 'string',
                enum: ['revoked', 'already_revoked', 'ignored_invalid', 'failed'],
              },
              sessionsRevoked: { type: 'integer' },
              userId: { type: 'string', format: 'uuid' },
              reason: { type: 'string' },
            },
          },
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
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

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.delete<{ Params: { userId: string } }>(
    '/auth/admin/sessions/:userId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
          required: ['userId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sessionsRevoked: { type: 'integer' },
            },
          },
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { userId } = request.params;

      const result = await authService.revokeUserSessionsByFederatedIdentity(config, {
        tenantId: user.tenantId,
        userId,
        sourceType: 'admin',
      });

      const eventBus = fastify.eventBus;
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
    },
  );

  const sessionListQueryJsonSchema = {
    type: 'object',
    properties: {
      userId: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: ['active', 'expired', 'revoked'] },
      cursor: { type: 'string' },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
    },
  };

  fastify.get<{
    Querystring: { userId?: string; status?: string; cursor?: string; limit?: number };
  }>(
    '/auth/admin/sessions',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:read'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: sessionListQueryJsonSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              sessions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sessionId: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    userEmail: { type: 'string', format: 'email' },
                    tenantId: { type: 'string', format: 'uuid' },
                    createdAt: { type: 'string', format: 'date-time' },
                    lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
                    expiresAt: { type: 'string', format: 'date-time' },
                    deviceInfo: {
                      type: 'object',
                      properties: {
                        userAgent: { type: 'string', nullable: true },
                        ipAddress: { type: 'string', nullable: true },
                      },
                      nullable: true,
                    },
                    status: { type: 'string', enum: ['active', 'expired', 'revoked'] },
                  },
                  required: [
                    'sessionId',
                    'userId',
                    'userEmail',
                    'tenantId',
                    'createdAt',
                    'expiresAt',
                    'status',
                  ],
                },
              },
              nextCursor: { type: 'string', nullable: true },
              total: { type: 'number' },
            },
            required: ['sessions', 'total'],
          },
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
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
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/auth/admin/sessions/:sessionId/revoke',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
          },
          required: ['sessionId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              result: {
                type: 'string',
                enum: ['revoked', 'already_revoked', 'not_found', 'forbidden', 'failed'],
              },
              sessionId: { type: 'string', format: 'uuid' },
              reason: { type: 'string' },
            },
            required: ['result', 'sessionId', 'reason'],
          },
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;

      const result = await authService.revokeSingleSession(config, {
        sessionId,
        tenantId: user.tenantId,
      });

      if (result.result === 'revoked') {
        const eventBus = fastify.eventBus;
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
    },
  );

  fastify.delete<{ Params: { userId: string } }>(
    '/auth/admin/sessions/user/:userId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
          required: ['userId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              result: {
                type: 'string',
                enum: ['revoked', 'already_revoked', 'not_found', 'forbidden', 'failed'],
              },
              sessionsRevoked: { type: 'number' },
              reason: { type: 'string' },
            },
            required: ['result', 'sessionsRevoked', 'reason'],
          },
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { userId } = request.params;

      const result = await authService.revokeAllUserSessions(config, {
        userId,
        tenantId: user.tenantId,
        initiatedBy: user.userId,
      });

      if (result.result === 'revoked') {
        const eventBus = fastify.eventBus;
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
    },
  );

  fastify.delete(
    '/auth/admin/sessions',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'sessions:revoke:tenant'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              result: { type: 'string', enum: ['revoked', 'failed'] },
              sessionsRevoked: { type: 'number' },
              reason: { type: 'string' },
            },
            required: ['result', 'sessionsRevoked', 'reason'],
          },
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;

      const result = await authService.revokeAllTenantSessions(config, {
        tenantId: user.tenantId,
        initiatedBy: user.userId,
      });

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.get(
    '/auth/roles',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                isSystem: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'name', 'description', 'isSystem', 'createdAt', 'updatedAt'],
            },
          },
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request, _reply) => {
      const tenantContextVal = request.tenantContext;

      if (!tenantContextVal) {
        throw new AuthError({
          message: 'Tenant context required',
          statusCode: 400,
        });
      }

      const roles = await delegationService.listTenantRoles(config, tenantContextVal.tenantId);

      return roles;
    },
  );

  fastify.get(
    '/auth/roles/:roleId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            roleId: { type: 'string', format: 'uuid' },
          },
          required: ['roleId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              isSystem: { type: 'boolean' },
              permissions: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
            required: [
              'id',
              'name',
              'description',
              'isSystem',
              'permissions',
              'createdAt',
              'updatedAt',
            ],
          },
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (request, reply) => {
      const tenantContextVal = request.tenantContext;
      const { roleId } = request.params as { roleId: string };

      if (!tenantContextVal) {
        throw new AuthError({
          message: 'Tenant context required',
          statusCode: 400,
        });
      }

      const role = await delegationService.getRoleDetails(
        config,
        roleId,
        tenantContextVal.tenantId,
      );

      if (!role) {
        reply.code(404);
        return { message: 'Role not found' };
      }

      return role;
    },
  );

  fastify.post(
    '/auth/roles',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'role:create'),
        idempotency,
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
            description: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'permissions'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              outcome: { type: 'string', enum: ['allowed'] },
              roleId: { type: 'string', format: 'uuid' },
            },
            required: ['outcome', 'roleId'],
          },
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    async (request, reply) => {
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

        const eventBus = fastify.eventBus;
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

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.post(
    '/auth/roles/:roleId/assign',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'role:assign'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            roleId: { type: 'string', format: 'uuid' },
          },
          required: ['roleId'],
        },
        body: {
          type: 'object',
          properties: {
            targetUserId: { type: 'string', format: 'uuid' },
            scope: { type: 'string', nullable: true },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
          },
          required: ['targetUserId'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              outcome: { type: 'string', enum: ['allowed'] },
            },
            required: ['outcome'],
          },
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const tenantContextVal = request.tenantContext;
      const { roleId } = request.params as { roleId: string };
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

        const eventBus = fastify.eventBus;
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

      const eventBus = fastify.eventBus;
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
    },
  );

  fastify.patch(
    '/auth/roles/:roleId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        requirePermission('admin', 'role:write'),
        idempotency,
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            roleId: { type: 'string', format: 'uuid' },
          },
          required: ['roleId'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
            description: { type: 'string', nullable: true },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              outcome: { type: 'string', enum: ['allowed'] },
            },
            required: ['outcome'],
          },
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const tenantContextVal = request.tenantContext;
      const { roleId } = request.params as { roleId: string };
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

        const eventBus = fastify.eventBus;
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

      const eventBus = fastify.eventBus;
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
    },
  );
};
