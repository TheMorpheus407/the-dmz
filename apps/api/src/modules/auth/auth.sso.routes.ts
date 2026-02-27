import { ErrorCodes } from '@the-dmz/shared/constants';
import { SSOProviderType } from '@the-dmz/shared/auth';

import { preAuthTenantResolver } from '../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import { authGuard } from './auth.routes.js';
import * as ssoService from './auth.sso.service.js';
import { SSOError } from './auth.sso.service.js';
import * as authService from './auth.service.js';
import {
  createSSOLoginInitiatedEvent,
  createSSOLoginFailedEvent,
  createSSOLogoutInitiatedEvent,
  createSSOLogoutProcessedEvent,
  createSSOLogoutFailedEvent,
} from './auth.events.js';

import type { FastifyInstance } from 'fastify';

export const ssoProvidersResponseJsonSchema = {
  type: 'object',
  properties: {
    providers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          provider: { type: 'string', enum: ['saml', 'oidc'] },
          isActive: { type: 'boolean' },
        },
        required: ['id', 'name', 'provider', 'isActive'],
      },
    },
  },
  required: ['providers'],
} as const;

export const ssoLoginInitiateRequestJsonSchema = {
  type: 'object',
  properties: {
    providerId: { type: 'string', format: 'uuid' },
    redirectUri: { type: 'string', format: 'uri' },
  },
  required: ['providerId'],
} as const;

export type SSOLoginInitiateRequest = {
  providerId: string;
  redirectUri?: string;
};

export const ssoLoginInitiateResponseJsonSchema = {
  type: 'object',
  properties: {
    authorizationUrl: { type: 'string', format: 'uri' },
    state: { type: 'string' },
  },
  required: ['authorizationUrl', 'state'],
} as const;

export const ssoSAMLMetadataResponseJsonSchema = {
  type: 'object',
  properties: {
    entityId: { type: 'string' },
    ssoUrl: { type: 'string', format: 'uri' },
    certificates: {
      type: 'array',
      items: { type: 'string' },
    },
    signatureAlgorithm: { type: 'string' },
    wantAssertionsSigned: { type: 'boolean' },
    wantMessagesSigned: { type: 'boolean' },
  },
  required: ['entityId', 'ssoUrl', 'certificates'],
} as const;

export const samlACSRequestJsonSchema = {
  type: 'object',
  properties: {
    SAMLResponse: { type: 'string' },
    RelayState: { type: 'string' },
  },
  required: ['SAMLResponse'],
} as const;

export type SAMLACSRequest = {
  SAMLResponse: string;
  RelayState?: string;
};

export const oidcCallbackRequestJsonSchema = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    state: { type: 'string' },
    error: { type: 'string' },
    error_description: { type: 'string' },
  },
  required: ['state'],
} as const;

export type OIDCCallbackRequest = {
  code?: string;
  state: string;
  error?: string;
  error_description?: string;
};

export const samlLogoutCallbackRequestJsonSchema = {
  type: 'object',
  properties: {
    SAMLResponse: { type: 'string' },
    SAMLRequest: { type: 'string' },
    RelayState: { type: 'string' },
  },
} as const;

export type SAMLLogoutCallbackRequest = {
  SAMLResponse?: string;
  SAMLRequest?: string;
  RelayState?: string;
};

export const oidcLogoutCallbackRequestJsonSchema = {
  type: 'object',
  properties: {
    id_token_hint: { type: 'string' },
    post_logout_redirect_uri: { type: 'string', format: 'uri' },
    state: { type: 'string' },
  },
} as const;

export type OIDCLogoutCallbackRequest = {
  id_token_hint?: string;
  post_logout_redirect_uri?: string;
  state?: string;
};

export const federatedRevocationResponseJsonSchema = {
  type: 'object',
  properties: {
    result: { type: 'string', enum: ['revoked', 'already_revoked', 'ignored_invalid', 'failed'] },
    sessionsRevoked: { type: 'integer' },
    userId: { type: 'string', format: 'uuid' },
    reason: { type: 'string' },
  },
} as const;

export const registerSSORoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.get(
    '/auth/sso/providers',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: ssoProvidersResponseJsonSchema,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as { tenantId: string };
      const providers = await ssoService.getActiveSSOProviders(user.tenantId);

      return {
        providers: providers.map((p) => ({
          id: p.id,
          name: p.name,
          provider: p.provider,
          isActive: p.isActive,
        })),
      };
    },
  );

  fastify.post<{ Body: SSOLoginInitiateRequest }>(
    '/auth/sso/oidc/authorize',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: ssoLoginInitiateRequestJsonSchema,
        response: {
          200: ssoLoginInitiateResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      if (!tenantId) {
        throw new SSOError({
          message: 'Tenant context required',
          code: ErrorCodes.TENANT_CONTEXT_MISSING,
          statusCode: 400,
        });
      }

      const { providerId, redirectUri } = request.body;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider) {
        throw new SSOError({
          message: 'SSO provider not found',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      if (!provider.isActive) {
        throw new SSOError({
          message: 'SSO provider is inactive',
          code: ErrorCodes.SSO_PROVIDER_INACTIVE,
          statusCode: 403,
        });
      }

      if (provider.provider !== 'oidc') {
        throw new SSOError({
          message: 'Invalid provider type for this endpoint',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 400,
        });
      }

      const state = ssoService.generateState();
      const nonce = ssoService.generateNonce();

      const defaultRedirectUri = `${config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173'}/auth/sso/oidc/callback`;
      const finalRedirectUri = redirectUri || defaultRedirectUri;

      const authorizationUrl = ssoService.buildOIDCAuthorizationUrl(
        {
          type: SSOProviderType.OIDC,
          issuer: provider.metadataUrl || '',
          clientId: provider.clientId || '',
          authorizationEndpoint: 'https://idp.example.com/authorize',
          tokenEndpoint: 'https://idp.example.com/token',
          jwksUri: 'https://idp.example.com/.well-known/jwks.json',
          scopes: ['openid', 'email', 'profile'],
          idTokenSignedResponseAlg: 'RS256',
          allowedClockSkewSeconds: 60,
          responseType: 'code',
        },
        provider.clientId || '',
        finalRedirectUri,
        state,
        nonce,
      );

      const eventBus = fastify.eventBus;
      eventBus.publish(
        createSSOLoginInitiatedEvent({
          source: 'auth-sso-module',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: {
            tenantId,
            ssoProviderId: providerId,
            providerType: 'oidc',
            redirectUri: finalRedirectUri,
          },
        }),
      );

      return {
        authorizationUrl,
        state,
      };
    },
  );

  fastify.get<{ Params: { providerId: string } }>(
    '/auth/sso/saml/metadata/:providerId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard],
      schema: {
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        response: {
          200: ssoSAMLMetadataResponseJsonSchema,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      if (!tenantId) {
        throw new SSOError({
          message: 'Tenant context required',
          code: ErrorCodes.TENANT_CONTEXT_MISSING,
          statusCode: 400,
        });
      }

      const { providerId } = request.params;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider) {
        throw new SSOError({
          message: 'SSO provider not found',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      if (!provider.isActive) {
        throw new SSOError({
          message: 'SSO provider is inactive',
          code: ErrorCodes.SSO_PROVIDER_INACTIVE,
          statusCode: 403,
        });
      }

      if (provider.provider !== 'saml') {
        throw new SSOError({
          message: 'Invalid provider type',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 400,
        });
      }

      return {
        entityId: `${config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173'}/auth/sso/saml/metadata/${providerId}`,
        ssoUrl: provider.metadataUrl || '',
        certificates: [],
        signatureAlgorithm: 'RSA-SHA256',
        wantAssertionsSigned: true,
        wantMessagesSigned: false,
      };
    },
  );

  fastify.post<{ Body: SAMLACSRequest; Params: { providerId: string } }>(
    '/auth/sso/saml/acs/:providerId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        body: samlACSRequestJsonSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              userId: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              accessToken: { type: 'string' },
            },
            required: ['userId', 'accessToken'],
          },
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      if (!tenantId) {
        throw new SSOError({
          message: 'Tenant context required',
          code: ErrorCodes.TENANT_CONTEXT_MISSING,
          statusCode: 400,
        });
      }

      const { providerId } = request.params;
      const { SAMLResponse: _SAMLResponse, RelayState: _RelayState } = request.body;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider || !provider.isActive || provider.provider !== 'saml') {
        throw new SSOError({
          message: 'SSO provider not found or inactive',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      const eventBus = fastify.eventBus;
      eventBus.publish(
        createSSOLoginFailedEvent({
          source: 'auth-sso-module',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: {
            tenantId,
            ssoProviderId: providerId,
            providerType: 'saml',
            reason: 'SAML login not fully implemented - placeholder',
            failureCode: 'SSO_NOT_IMPLEMENTED',
            correlationId: request.id,
          },
        }),
      );

      throw new SSOError({
        message: 'SAML assertion processing not fully implemented',
        code: ErrorCodes.SSO_CONFIGURATION_ERROR,
        statusCode: 501,
        correlationId: request.id,
      });
    },
  );

  fastify.get<{ Params: { providerId: string }; Querystring: OIDCCallbackRequest }>(
    '/auth/sso/oidc/callback/:providerId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        querystring: oidcCallbackRequestJsonSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              userId: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              accessToken: { type: 'string' },
            },
            required: ['userId', 'accessToken'],
          },
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      if (!tenantId) {
        throw new SSOError({
          message: 'Tenant context required',
          code: ErrorCodes.TENANT_CONTEXT_MISSING,
          statusCode: 400,
        });
      }

      const { providerId } = request.params;
      const { code, state, error, error_description } = request.query;

      if (error) {
        const eventBus = fastify.eventBus;
        eventBus.publish(
          createSSOLoginFailedEvent({
            source: 'auth-sso-module',
            correlationId: request.id,
            tenantId,
            version: 1,
            payload: {
              tenantId,
              ssoProviderId: providerId,
              providerType: 'oidc',
              reason: error_description || error,
              failureCode: error.toUpperCase(),
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: error_description || error,
          code: ErrorCodes.SSO_TOKEN_INVALID,
          statusCode: 400,
          correlationId: request.id,
        });
      }

      if (!code || !state) {
        throw new SSOError({
          message: 'Missing required parameters',
          code: ErrorCodes.SSO_INVALID_STATE,
          statusCode: 400,
        });
      }

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider || !provider.isActive || provider.provider !== 'oidc') {
        throw new SSOError({
          message: 'SSO provider not found or inactive',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      const eventBus = fastify.eventBus;
      eventBus.publish(
        createSSOLoginFailedEvent({
          source: 'auth-sso-module',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: {
            tenantId,
            ssoProviderId: providerId,
            providerType: 'oidc',
            reason: 'OIDC callback not fully implemented - placeholder',
            failureCode: 'SSO_NOT_IMPLEMENTED',
            correlationId: request.id,
          },
        }),
      );

      throw new SSOError({
        message: 'OIDC callback token exchange not fully implemented',
        code: ErrorCodes.SSO_CONFIGURATION_ERROR,
        statusCode: 501,
        correlationId: request.id,
      });
    },
  );

  fastify.post<{ Body: SAMLLogoutCallbackRequest; Params: { providerId: string } }>(
    '/auth/sso/saml/logout/:providerId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        body: samlLogoutCallbackRequestJsonSchema,
        response: {
          200: federatedRevocationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      if (!tenantId) {
        throw new SSOError({
          message: 'Tenant context required',
          code: ErrorCodes.TENANT_CONTEXT_MISSING,
          statusCode: 400,
        });
      }

      const { providerId } = request.params;
      const { SAMLResponse: _SAMLResponse, RelayState: _RelayState } = request.body;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider || !provider.isActive || provider.provider !== 'saml') {
        throw new SSOError({
          message: 'SSO provider not found or inactive',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      const eventBus = fastify.eventBus;
      eventBus.publish(
        createSSOLogoutInitiatedEvent({
          source: 'auth-sso-module',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: {
            tenantId,
            ssoProviderId: providerId,
            providerType: 'saml',
            logoutType: 'idp_initiated',
            correlationId: request.id,
          },
        }),
      );

      throw new SSOError({
        message: 'SAML logout processing not fully implemented',
        code: ErrorCodes.SSO_CONFIGURATION_ERROR,
        statusCode: 501,
        correlationId: request.id,
      });
    },
  );

  fastify.get<{ Querystring: OIDCLogoutCallbackRequest; Params: { providerId: string } }>(
    '/auth/sso/oidc/logout/:providerId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard],
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        querystring: oidcLogoutCallbackRequestJsonSchema,
        response: {
          200: federatedRevocationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: {
            oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden],
          },
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const tenantId = request.preAuthTenantContext?.tenantId;
      if (!tenantId) {
        throw new SSOError({
          message: 'Tenant context required',
          code: ErrorCodes.TENANT_CONTEXT_MISSING,
          statusCode: 400,
        });
      }

      const { providerId } = request.params;
      const {
        id_token_hint: _idTokenHint,
        post_logout_redirect_uri: _postLogoutRedirectUri,
        state: _state,
      } = request.query;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider || !provider.isActive || provider.provider !== 'oidc') {
        throw new SSOError({
          message: 'SSO provider not found or inactive',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      const eventBus = fastify.eventBus;
      eventBus.publish(
        createSSOLogoutInitiatedEvent({
          source: 'auth-sso-module',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: {
            tenantId,
            ssoProviderId: providerId,
            providerType: 'oidc',
            logoutType: 'back_channel',
            correlationId: request.id,
          },
        }),
      );

      throw new SSOError({
        message: 'OIDC logout processing not fully implemented',
        code: ErrorCodes.SSO_CONFIGURATION_ERROR,
        statusCode: 501,
        correlationId: request.id,
      });
    },
  );

  fastify.post<{ Params: { providerId: string }; Body: { userId?: string; email?: string } }>(
    '/auth/sso/saml/revoke/:providerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            providerId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: federatedRevocationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as { tenantId: string };
      const { providerId } = request.params;
      const body = request.body as { userId?: string; email?: string };
      const userId = body?.userId;
      const email = body?.email;

      const revocationResult = await authService.revokeUserSessionsByFederatedIdentity(config, {
        tenantId: user.tenantId,
        ...(userId && { userId }),
        ...(email && { email }),
        sourceType: 'saml',
        ssoProviderId: providerId,
      });

      const eventBus = fastify.eventBus;
      if (revocationResult.result === 'revoked' && revocationResult.userId) {
        eventBus.publish(
          createSSOLogoutProcessedEvent({
            source: 'auth-sso-module',
            correlationId: request.id,
            tenantId: user.tenantId,
            version: 1,
            payload: {
              tenantId: user.tenantId,
              ssoProviderId: providerId,
              providerType: 'saml',
              userId: revocationResult.userId,
              sessionsRevoked: revocationResult.sessionsRevoked,
              result: revocationResult.result,
              correlationId: request.id,
            },
          }),
        );
      } else {
        eventBus.publish(
          createSSOLogoutFailedEvent({
            source: 'auth-sso-module',
            correlationId: request.id,
            tenantId: user.tenantId,
            version: 1,
            payload: {
              tenantId: user.tenantId,
              ssoProviderId: providerId,
              providerType: 'saml',
              reason: revocationResult.reason || 'revocation_failed',
              errorCode: 'REVOCATION_FAILED',
              correlationId: request.id,
            },
          }),
        );
      }

      return revocationResult;
    },
  );

  fastify.post<{ Params: { providerId: string }; Body: { userId?: string; email?: string } }>(
    '/auth/sso/oidc/revoke/:providerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            providerId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: federatedRevocationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request) => {
      const user = request.user as { tenantId: string };
      const { providerId } = request.params;
      const body = request.body as { userId?: string; email?: string };
      const userId = body?.userId;
      const email = body?.email;

      const revocationResult = await authService.revokeUserSessionsByFederatedIdentity(config, {
        tenantId: user.tenantId,
        ...(userId && { userId }),
        ...(email && { email }),
        sourceType: 'oidc',
        ssoProviderId: providerId,
      });

      const eventBus = fastify.eventBus;
      if (revocationResult.result === 'revoked' && revocationResult.userId) {
        eventBus.publish(
          createSSOLogoutProcessedEvent({
            source: 'auth-sso-module',
            correlationId: request.id,
            tenantId: user.tenantId,
            version: 1,
            payload: {
              tenantId: user.tenantId,
              ssoProviderId: providerId,
              providerType: 'oidc',
              userId: revocationResult.userId,
              sessionsRevoked: revocationResult.sessionsRevoked,
              result: revocationResult.result,
              correlationId: request.id,
            },
          }),
        );
      } else {
        eventBus.publish(
          createSSOLogoutFailedEvent({
            source: 'auth-sso-module',
            correlationId: request.id,
            tenantId: user.tenantId,
            version: 1,
            payload: {
              tenantId: user.tenantId,
              ssoProviderId: providerId,
              providerType: 'oidc',
              reason: revocationResult.reason || 'revocation_failed',
              errorCode: 'REVOCATION_FAILED',
              correlationId: request.id,
            },
          }),
        );
      }

      return revocationResult;
    },
  );
};
