import type { LoginInput, RegisterInput, RefreshTokenInput } from '@the-dmz/shared/schemas';
import { AuthAbuseCategory } from '@the-dmz/shared/contracts';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { preAuthTenantResolver } from '../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { requireMfaForSuperAdmin } from '../../shared/middleware/mfa-guard.js';
import { idempotency } from '../../shared/middleware/idempotency.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { createAbuseGuard } from '../../shared/middleware/abuse-guard.js';

import { validateCsrf } from './csrf.js';
import * as handlers from './auth.handlers.js';
import * as schemas from './auth.schemas.js';

import type { AuthenticatedUser } from './auth.types.js';
import type { FastifyInstance } from 'fastify';
import type { UpdateProfileData } from './auth.repo.js';

export { authGuard };

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export const registerAuthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';
  const tenantResolverEnabled = config.TENANT_RESOLVER_ENABLED ?? false;
  const deps = { config, eventBus: fastify.eventBus };

  const preAuthMiddleware = tenantResolverEnabled
    ? [preAuthTenantResolver(), preAuthTenantStatusGuard]
    : [];

  fastify.post<{ Body: RegisterInput }>(
    '/auth/register',
    {
      preHandler: [
        ...preAuthMiddleware,
        createAbuseGuard(AuthAbuseCategory.REGISTER, { emailField: 'email' }),
      ],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 5,
              timeWindow: '1 hour',
            },
      },
      schema: {
        body: schemas.registerBodyJsonSchema,
        response: {
          201: schemas.authResponseJsonSchema,
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
    (request, reply) => handlers.handleRegister(request, reply, deps),
  );

  fastify.post<{ Body: LoginInput }>(
    '/auth/login',
    {
      preHandler: [
        ...preAuthMiddleware,
        createAbuseGuard(AuthAbuseCategory.LOGIN, { emailField: 'email' }),
      ],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '15 minutes',
            },
      },
      schema: {
        body: schemas.loginBodyJsonSchema,
        response: {
          200: schemas.authResponseJsonSchema,
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
    (request, reply) => handlers.handleLogin(request, reply, deps),
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
          200: schemas.refreshResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
    },
    (request, reply) => handlers.handleRefresh(request, reply, deps),
  );

  fastify.delete(
    '/auth/logout',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf],
      schema: {
        security: [{ bearerAuth: [] }, { cookieAuth: [] }, { csrfToken: [] }],
        response: {
          200: schemas.logoutResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleLogout(request, reply, deps),
  );

  fastify.get(
    '/auth/me',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.meResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleMe(request, deps),
  );

  fastify.patch<{ Body: UpdateProfileData }>(
    '/auth/profile',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, validateCsrf, idempotency],
      schema: {
        security: [{ bearerAuth: [] }],
        body: schemas.updateProfileBodyJsonSchema,
        response: {
          200: schemas.profileResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleUpdateProfile(request, deps),
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
          200: schemas.healthAuthenticatedResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleHealthAuthenticated(request),
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
          200: schemas.adminUsersListResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.Forbidden, errorResponseSchemas.TenantInactive],
          },
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    () => handlers.handleAdminUsersList(),
  );

  fastify.post<{ Body: { email: string } }>(
    '/auth/password/reset',
    {
      preHandler: [
        ...preAuthMiddleware,
        createAbuseGuard(AuthAbuseCategory.PASSWORD_RESET, { emailField: 'email' }),
      ],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 3,
              timeWindow: '1 hour',
            },
      },
      schema: {
        body: schemas.passwordResetRequestBodyJsonSchema,
        response: {
          200: schemas.passwordResetRequestResponseJsonSchema,
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
    (request) => handlers.handlePasswordReset(request, deps),
  );

  fastify.post<{ Body: { token: string; password: string } }>(
    '/auth/password/change',
    {
      preHandler: [...preAuthMiddleware, createAbuseGuard(AuthAbuseCategory.PASSWORD_CHANGE)],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: schemas.passwordChangeRequestBodyJsonSchema,
        response: {
          200: schemas.passwordChangeRequestResponseJsonSchema,
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
    (request) => handlers.handlePasswordChange(request, deps),
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
        body: schemas.oauthTokenBodyJsonSchema,
        response: {
          200: schemas.oauthTokenResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
        },
      },
    },
    (request) => handlers.handleOAuthToken(request, deps),
  );

  fastify.get(
    '/auth/oauth/clients',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.oauthClientsListResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientsList(request, deps),
  );

  fastify.post<{ Body: { name: string; scopes: string[] } }>(
    '/auth/oauth/clients',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: schemas.oauthClientCreateBodyJsonSchema,
        response: {
          201: schemas.oauthClientCreateResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleOAuthClientCreate(request, reply, deps),
  );

  fastify.post<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id/rotate',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.oauthClientIdParamJsonSchema,
        response: {
          200: schemas.oauthClientRotateResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientRotate(request, deps),
  );

  fastify.post<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id/revoke',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.oauthClientIdParamJsonSchema,
        response: {
          200: schemas.oauthClientRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientRevoke(request, deps),
  );

  fastify.delete<{ Params: { id: string } }>(
    '/auth/oauth/clients/:id',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.oauthClientIdParamJsonSchema,
        response: {
          200: schemas.oauthClientRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleOAuthClientDelete(request, deps),
  );

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
        body: schemas.federatedRevocationBodyJsonSchema,
        response: {
          200: schemas.federatedRevocationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) => handlers.handleFederatedSessionRevoke(request, deps),
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
        params: schemas.userIdParamJsonSchema,
        response: {
          200: schemas.sessionRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) => handlers.handleAdminSessionRevokeByUser(request, deps),
  );

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
        querystring: schemas.sessionListQueryJsonSchema,
        response: {
          200: schemas.sessionListResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request) => handlers.handleAdminSessionList(request, deps),
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
        params: schemas.sessionIdParamJsonSchema,
        response: {
          200: schemas.sessionSingleRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) => handlers.handleAdminSessionRevokeSingle(request, deps),
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
        params: schemas.userIdParamJsonSchema,
        response: {
          200: schemas.sessionUserAllRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) => handlers.handleAdminSessionRevokeUserAll(request, deps),
  );

  fastify.delete(
    '/auth/admin/sessions',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'sessions:revoke:tenant'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.sessionTenantAllRevokeResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) => handlers.handleAdminSessionRevokeTenantAll(request, deps),
  );

  fastify.get(
    '/auth/roles',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: schemas.rolesListResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    (request) => handlers.handleRolesList(request, deps),
  );

  fastify.get<{ Params: { roleId: string } }>(
    '/auth/roles/:roleId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.roleIdParamJsonSchema,
        response: {
          200: schemas.roleDetailsResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    (request, reply) => handlers.handleRoleDetails(request, reply, deps),
  );

  fastify.post(
    '/auth/roles',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'role:create'),
        idempotency,
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: schemas.roleCreateBodyJsonSchema,
        response: {
          201: schemas.roleCreateResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    (request, reply) => handlers.handleRoleCreate(request, reply, deps),
  );

  fastify.post<{ Params: { roleId: string } }>(
    '/auth/roles/:roleId/assign',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'role:assign'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.roleIdParamJsonSchema,
        body: schemas.roleAssignBodyJsonSchema,
        response: {
          201: schemas.roleAssignResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    (request, reply) => handlers.handleRoleAssign(request, reply, deps),
  );

  fastify.patch<{ Params: { roleId: string } }>(
    '/auth/roles/:roleId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('admin', 'role:write'),
        idempotency,
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        params: schemas.roleIdParamJsonSchema,
        body: schemas.roleUpdateBodyJsonSchema,
        response: {
          200: schemas.roleAssignResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
        },
      },
    },
    (request, reply) => handlers.handleRoleUpdate(request, reply, deps),
  );
};
