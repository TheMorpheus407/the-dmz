import { ErrorCodes } from '@the-dmz/shared/constants';

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
  createSSOLoginSuccessEvent,
  createSSOLoginFailedEvent,
  createSSOLogoutInitiatedEvent,
  createSSOLogoutProcessedEvent,
  createSSOLogoutFailedEvent,
} from './auth.events.js';

import { signJWT, createSession, findUserById } from './index.js';

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

      // Generate PKCE code_verifier
      const codeVerifier = ssoService.generatePKCECodeVerifier();
      const codeChallenge = await ssoService.generatePKCECodeChallenge(codeVerifier);

      // Store state with code_verifier for later verification
      await ssoService.storeOIDCState(state, {
        providerId,
        redirectUri: redirectUri || '',
        tenantId,
        nonce,
        pkceCodeVerifier: codeVerifier,
      });

      const defaultRedirectUri = `${config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173'}/auth/sso/oidc/callback/${providerId}`;
      const finalRedirectUri = redirectUri || defaultRedirectUri;

      // Get OIDC provider configuration (fetch discovery metadata)
      const { metadata, clientId } = await ssoService.getOIDCProviderConfig(provider);

      const scopes = ['openid', 'email', 'profile'];
      if (metadata.scopesSupported?.includes('groups')) {
        scopes.push('groups');
      }

      // Build authorization URL with PKCE
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: finalRedirectUri,
        scope: scopes.join(' '),
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authorizationUrl = `${metadata.authorizationEndpoint}?${params.toString()}`;

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
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const { providerId } = request.params;

      const provider = await ssoService.getSSOProviderById(providerId);
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
        certificates: provider.idpCertificate ? [provider.idpCertificate] : [],
        signatureAlgorithm: 'RSA-SHA256',
        wantAssertionsSigned: true,
        wantMessagesSigned: false,
      };
    },
  );

  fastify.get<{ Params: { providerId: string } }>(
    '/auth/sso/oidc/.well-known/openid-configuration/:providerId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            providerId: { type: 'string', format: 'uuid' },
          },
          required: ['providerId'],
        },
        response: {
          200: {
            type: 'object',
          },
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const { providerId } = request.params;

      const provider = await ssoService.getSSOProviderById(providerId);
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
          message: 'Invalid provider type',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 400,
        });
      }

      const baseUrl = config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173';

      try {
        const { metadata } = await ssoService.getOIDCProviderConfig(provider);

        return {
          issuer: metadata.issuer,
          authorization_endpoint: `${baseUrl}/api/v1/auth/sso/oidc/authorize/${providerId}`,
          token_endpoint: `${baseUrl}/api/v1/auth/sso/oidc/token/${providerId}`,
          userinfo_endpoint: metadata.userinfoEndpoint || undefined,
          jwks_uri: metadata.jwksUri,
          end_session_endpoint: metadata.endSessionEndpoint
            ? `${baseUrl}/api/v1/auth/sso/oidc/logout/${providerId}`
            : undefined,
          revocation_endpoint: `${baseUrl}/api/v1/auth/sso/oidc/revoke/${providerId}`,
          introspection_endpoint: metadata.introspectionEndpoint || undefined,
          response_types_supported: ['code'],
          response_modes_supported: ['query', 'fragment'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: [
            'RS256',
            'RS384',
            'RS512',
            'ES256',
            'ES384',
            'ES512',
          ],
          token_endpoint_auth_methods_supported: [
            'client_secret_basic',
            'client_secret_post',
            'client_secret_jwt',
            'private_key_jwt',
          ],
          claims_supported: [
            'sub',
            'iss',
            'aud',
            'exp',
            'iat',
            'nonce',
            'email',
            'email_verified',
            'name',
            'given_name',
            'family_name',
            'middle_name',
            'nickname',
            'picture',
            'groups',
          ],
          scopes_supported: ['openid', 'profile', 'email', 'groups'],
          ui_locales_supported: ['en-US'],
          code_challenge_methods_supported: ['S256'],
        };
      } catch {
        throw new SSOError({
          message: 'Failed to retrieve OIDC provider configuration',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }
    },
  );

  fastify.get<{
    Params: { providerId: string };
    Querystring: { redirectUri?: string; relayState?: string };
  }>(
    '/auth/sso/saml/login/:providerId',
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
        querystring: {
          type: 'object',
          properties: {
            redirectUri: { type: 'string', format: 'uri' },
            relayState: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              authorizationUrl: { type: 'string' },
              relayState: { type: 'string' },
            },
            required: ['authorizationUrl'],
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
      const { redirectUri, relayState } = request.query;

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
          message: 'Invalid provider type for this endpoint',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 400,
        });
      }

      const baseUrl = config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173';
      const acsUrl = `${baseUrl}/api/v1/auth/sso/saml/acs/${providerId}`;

      const authorizationUrl = ssoService.buildSAMLAuthnRequest(
        provider,
        acsUrl,
        tenantId,
        relayState || redirectUri,
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
            providerType: 'saml',
            redirectUri: redirectUri || baseUrl,
          },
        }),
      );

      return {
        authorizationUrl,
        relayState: relayState || redirectUri,
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
      const { SAMLResponse, RelayState: _RelayState } = request.body;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider || !provider.isActive || provider.provider !== 'saml') {
        throw new SSOError({
          message: 'SSO provider not found or inactive',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      if (!SAMLResponse) {
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
              reason: 'Missing SAMLResponse parameter',
              failureCode: 'MISSING_PARAMETER',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: 'SAMLResponse is required',
          code: ErrorCodes.SSO_INVALID_REQUEST,
          statusCode: 400,
          correlationId: request.id,
        });
      }

      const baseUrl = config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173';
      const acsUrl = `${baseUrl}/api/v1/auth/sso/saml/acs/${providerId}`;
      const validationResult = await ssoService.validateSAMLResponse(
        SAMLResponse,
        provider,
        acsUrl,
        request.id,
      );

      if (!validationResult.valid || !validationResult.claims) {
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
              reason: validationResult.failureReason || 'Invalid SAML assertion',
              failureCode: validationResult.failureReason || 'INVALID_ASSERTION',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: 'SAML assertion validation failed',
          code: ErrorCodes.SSO_ASSERTION_INVALID,
          statusCode: 401,
          correlationId: request.id,
        });
      }

      const claims = validationResult.claims;
      const allowedRoles = ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'];
      const defaultRole = 'learner';

      const linkingResult = await ssoService.resolveSSOAccountLinking(
        tenantId,
        providerId,
        claims,
        defaultRole,
        allowedRoles,
      );

      if (linkingResult.outcome === 'denied_no_email') {
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
              reason: 'Email claim required but not provided',
              failureCode: 'MISSING_EMAIL',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: 'Email claim is required for SSO login',
          code: ErrorCodes.SSO_MISSING_EMAIL,
          statusCode: 400,
          correlationId: request.id,
        });
      }

      if (linkingResult.outcome === 'denied_role_escalation') {
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
              reason: 'Role escalation denied',
              failureCode: 'ROLE_ESCALATION_DENIED',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: 'Role cannot be assigned due to security policy',
          code: ErrorCodes.SSO_ROLE_ESCALATION_DENIED,
          statusCode: 403,
          correlationId: request.id,
        });
      }

      let userId: string;

      if (linkingResult.outcome === 'linked_existing' && linkingResult.userId) {
        userId = linkingResult.userId;
      } else if (linkingResult.outcome === 'linked_new_jit' && linkingResult.email) {
        const role = ssoService.mapGroupsToRole(
          claims.groups || [],
          provider.roleMappingRules || [],
          provider.defaultRole || 'learner',
          allowedRoles,
        );

        userId = await ssoService.createSSOUser(
          tenantId,
          linkingResult.email,
          claims.displayName,
          role,
        );
      } else {
        throw new SSOError({
          message: 'Failed to resolve SSO account',
          code: ErrorCodes.SSO_ACCOUNT_LINKING_FAILED,
          statusCode: 500,
          correlationId: request.id,
        });
      }

      await ssoService.linkUserToSSOIdentity(userId, tenantId, providerId, claims.subject, claims);

      const session = await createSession({} as Parameters<typeof createSession>[0], {
        userId,
        tenantId,
        tokenHash: '',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });

      const user = await findUserById({} as Parameters<typeof findUserById>[0], userId, tenantId);
      const userRole = user?.role ?? 'learner';

      const token = await signJWT(config, {
        sub: userId,
        tenantId,
        sessionId: session.id,
        role: userRole,
      });

      const eventBus = fastify.eventBus;
      eventBus.publish(
        createSSOLoginSuccessEvent({
          source: 'auth-sso-module',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: {
            tenantId,
            ssoProviderId: providerId,
            providerType: 'saml',
            userId,
            email: claims.email || '',
            subject: claims.subject,
            linkingOutcome: linkingResult.outcome,
          },
        }),
      );

      return {
        userId,
        email: claims.email,
        accessToken: token,
      };
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
      const { code, state: queryState, error, error_description } = request.query;

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

      if (!code || !queryState) {
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

      // Retrieve stored state and code_verifier
      const stateData = await ssoService.getOIDCState(queryState);
      if (!stateData) {
        throw new SSOError({
          message: 'Invalid or expired state parameter',
          code: ErrorCodes.SSO_INVALID_STATE,
          statusCode: 400,
        });
      }

      // Verify state matches
      if (stateData.providerId !== providerId || stateData.tenantId !== tenantId) {
        throw new SSOError({
          message: 'State parameter mismatch',
          code: ErrorCodes.SSO_INVALID_STATE,
          statusCode: 400,
        });
      }

      // Clean up state after use
      await ssoService.deleteOIDCState(queryState);

      const { metadata, clientId, clientSecret } = await ssoService.getOIDCProviderConfig(provider);

      const redirectUri =
        stateData.redirectUri ||
        `${config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173'}/auth/sso/oidc/callback/${providerId}`;

      // Exchange code for tokens
      let tokens: ssoService.OIDCTokens;
      try {
        tokens = await ssoService.exchangeCodeForTokens(
          metadata.tokenEndpoint,
          clientId,
          clientSecret,
          code,
          redirectUri,
          stateData.pkceCodeVerifier || '',
        );
      } catch (err) {
        const ssoError = err as SSOError;
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
              reason: ssoError.message || 'Token exchange failed',
              failureCode: 'TOKEN_EXCHANGE_FAILED',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: ssoError.message || 'Token exchange failed',
          code: ErrorCodes.SSO_TOKEN_EXCHANGE_FAILED,
          statusCode: 401,
          correlationId: request.id,
        });
      }

      // Validate ID token
      if (!tokens.idToken) {
        throw new SSOError({
          message: 'No ID token received from provider',
          code: ErrorCodes.SSO_TOKEN_INVALID,
          statusCode: 401,
          correlationId: request.id,
        });
      }

      const jwksUri = metadata.jwksUri;
      if (!jwksUri) {
        throw new SSOError({
          message: 'JWKS URI not configured for provider',
          code: ErrorCodes.SSO_CONFIGURATION_ERROR,
          statusCode: 500,
        });
      }

      const idTokenValidation = await ssoService.validateOIDCIdToken(
        tokens.idToken,
        jwksUri,
        metadata.issuer,
        clientId,
        stateData.nonce,
      );

      if (!idTokenValidation.valid) {
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
              reason: idTokenValidation.failureReason || 'ID token validation failed',
              failureCode: 'ID_TOKEN_INVALID',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: 'ID token validation failed',
          code: ErrorCodes.SSO_TOKEN_INVALID,
          statusCode: 401,
          correlationId: request.id,
        });
      }

      const idTokenClaims = idTokenValidation.claims || {};

      // Fetch UserInfo if available
      let userInfo: ssoService.OIDCUserInfoResponse | null = null;
      if (metadata.userinfoEndpoint && tokens.accessToken) {
        try {
          userInfo = await ssoService.fetchOIDCUserInfo(
            metadata.userinfoEndpoint,
            tokens.accessToken,
          );
        } catch {
          // UserInfo is optional, continue without it
        }
      }

      // Fetch transitive group memberships for Entra ID nested group support
      let transitiveGroups: string[] = [];
      const idTokenSubject = (idTokenValidation.claims?.['sub'] as string) || '';
      if (tokens.accessToken && idTokenSubject) {
        try {
          transitiveGroups = await ssoService.fetchTransitiveGroupMemberships(
            tokens.accessToken,
            idTokenSubject,
          );
        } catch {
          // Transitive groups are optional, continue without them
        }
      }

      // Extract claims from ID token or UserInfo
      const claims = {
        subject: (idTokenClaims['sub'] as string) || (userInfo?.sub as string) || '',
        email: (idTokenClaims['email'] as string) || (userInfo?.email as string) || undefined,
        displayName: (idTokenClaims['name'] as string) || (userInfo?.name as string) || undefined,
        groups: (idTokenClaims['groups'] as string[]) || [],
      };

      if (!claims.subject) {
        throw new SSOError({
          message: 'No subject claim in ID token',
          code: ErrorCodes.SSO_MISSING_REQUIRED_CLAIM,
          statusCode: 401,
          correlationId: request.id,
        });
      }

      // Resolve account linking
      const allowedRoles = ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'];
      const defaultRole = 'learner';

      const linkingResult = await ssoService.resolveSSOAccountLinking(
        tenantId,
        providerId,
        claims,
        defaultRole,
        allowedRoles,
      );

      if (linkingResult.outcome === 'denied_no_email') {
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
              reason: 'Email claim required but not provided',
              failureCode: 'MISSING_EMAIL',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: 'Email claim is required for SSO login',
          code: ErrorCodes.SSO_MISSING_EMAIL,
          statusCode: 400,
          correlationId: request.id,
        });
      }

      if (linkingResult.outcome === 'denied_role_escalation') {
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
              reason: 'Role escalation denied',
              failureCode: 'ROLE_ESCALATION_DENIED',
              correlationId: request.id,
            },
          }),
        );

        throw new SSOError({
          message: 'Role cannot be assigned due to security policy',
          code: ErrorCodes.SSO_ROLE_ESCALATION_DENIED,
          statusCode: 403,
          correlationId: request.id,
        });
      }

      let userId: string;

      if (linkingResult.outcome === 'linked_existing' && linkingResult.userId) {
        userId = linkingResult.userId;
      } else if (linkingResult.outcome === 'linked_new_jit' && linkingResult.email) {
        const role = ssoService.mapGroupsToRole(
          claims.groups || [],
          provider.roleMappingRules || [],
          provider.defaultRole || 'learner',
          allowedRoles,
          transitiveGroups,
        );

        userId = await ssoService.createSSOUser(
          tenantId,
          linkingResult.email,
          claims.displayName,
          role,
        );
      } else {
        throw new SSOError({
          message: 'Failed to resolve SSO account',
          code: ErrorCodes.SSO_ACCOUNT_LINKING_FAILED,
          statusCode: 500,
          correlationId: request.id,
        });
      }

      await ssoService.linkUserToSSOIdentity(userId, tenantId, providerId, claims.subject, claims);

      const session = await createSession({} as Parameters<typeof createSession>[0], {
        userId,
        tenantId,
        tokenHash: '',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });

      const user = await findUserById({} as Parameters<typeof findUserById>[0], userId, tenantId);
      const userRole = user?.role ?? 'learner';

      const token = await signJWT(config, {
        sub: userId,
        tenantId,
        sessionId: session.id,
        role: userRole,
      });

      const eventBus = fastify.eventBus;
      eventBus.publish(
        createSSOLoginSuccessEvent({
          source: 'auth-sso-module',
          correlationId: request.id,
          tenantId,
          version: 1,
          payload: {
            tenantId,
            ssoProviderId: providerId,
            providerType: 'oidc',
            userId,
            email: claims.email || '',
            subject: claims.subject,
            linkingOutcome: linkingResult.outcome,
          },
        }),
      );

      return {
        userId,
        email: claims.email,
        accessToken: token,
      };
    },
  );

  fastify.post<{
    Params: { providerId: string };
    Body: { grant_type: string; refresh_token?: string; code?: string; redirect_uri?: string };
  }>(
    '/auth/sso/oidc/token/:providerId',
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
        body: {
          type: 'object',
          properties: {
            grant_type: { type: 'string', enum: ['authorization_code', 'refresh_token'] },
            refresh_token: { type: 'string' },
            code: { type: 'string' },
            redirect_uri: { type: 'string', format: 'uri' },
          },
          required: ['grant_type'],
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
      const { grant_type, refresh_token, code } = request.body;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider || !provider.isActive || provider.provider !== 'oidc') {
        throw new SSOError({
          message: 'SSO provider not found or inactive',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      if (grant_type === 'refresh_token') {
        if (!refresh_token) {
          throw new SSOError({
            message: 'Refresh token is required',
            code: ErrorCodes.SSO_INVALID_REQUEST,
            statusCode: 400,
          });
        }

        try {
          const { metadata, clientId, clientSecret } =
            await ssoService.getOIDCProviderConfig(provider);

          if (!metadata.tokenEndpoint) {
            throw new SSOError({
              message: 'Token endpoint not configured',
              code: ErrorCodes.SSO_CONFIGURATION_ERROR,
              statusCode: 500,
            });
          }

          const refreshedTokens = await ssoService.refreshAccessToken(
            metadata.tokenEndpoint,
            clientId,
            clientSecret,
            refresh_token,
          );

          return {
            access_token: refreshedTokens.accessToken,
            token_type: 'Bearer',
            expires_in: refreshedTokens.expiresIn,
            refresh_token: refreshedTokens.refreshToken || refresh_token,
            id_token: refreshedTokens.idToken,
          };
        } catch (err) {
          const ssoError = err as SSOError;
          throw new SSOError({
            message: ssoError.message || 'Token refresh failed',
            code: ErrorCodes.SSO_TOKEN_INVALID,
            statusCode: 401,
          });
        }
      }

      if (grant_type === 'authorization_code') {
        if (!code) {
          throw new SSOError({
            message: 'Authorization code is required',
            code: ErrorCodes.SSO_INVALID_REQUEST,
            statusCode: 400,
          });
        }

        throw new SSOError({
          message: 'Use the OIDC callback endpoint for authorization code exchange',
          code: ErrorCodes.SSO_INVALID_REQUEST,
          statusCode: 400,
        });
      }

      throw new SSOError({
        message: 'Unsupported grant type',
        code: ErrorCodes.SSO_INVALID_REQUEST,
        statusCode: 400,
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

      const user = request.user as { userId?: string; tenantId: string } | undefined;
      const { providerId } = request.params;
      const { SAMLResponse, SAMLRequest, RelayState: _RelayState } = request.body;

      const provider = await ssoService.getSSOProvider(providerId, tenantId);
      if (!provider || !provider.isActive || provider.provider !== 'saml') {
        throw new SSOError({
          message: 'SSO provider not found or inactive',
          code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
          statusCode: 404,
        });
      }

      let userIdToRevoke: string | undefined;

      if (user?.userId) {
        userIdToRevoke = user.userId;
      }

      if (!SAMLResponse && !SAMLRequest && userIdToRevoke) {
        const revocationResult = await authService.revokeUserSessionsByFederatedIdentity(config, {
          tenantId,
          userId: userIdToRevoke,
          sourceType: 'saml',
          ssoProviderId: providerId,
        });

        const eventBus = fastify.eventBus;
        if (revocationResult.result === 'revoked' && revocationResult.userId) {
          eventBus.publish(
            createSSOLogoutProcessedEvent({
              source: 'auth-sso-module',
              correlationId: request.id,
              tenantId,
              version: 1,
              payload: {
                tenantId,
                ssoProviderId: providerId,
                providerType: 'saml',
                userId: revocationResult.userId || '',
                sessionsRevoked: revocationResult.sessionsRevoked,
                result:
                  revocationResult.result === 'revoked' ||
                  revocationResult.result === 'already_revoked'
                    ? revocationResult.result
                    : 'failed',
                correlationId: request.id,
              },
            }),
          );
        }

        return revocationResult;
      }

      if (SAMLRequest) {
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

        return {
          result: 'ignored_invalid',
          sessionsRevoked: 0,
          userId: undefined,
          reason: 'SAML logout request processing not fully implemented',
        };
      }

      if (SAMLResponse) {
        const baseUrl = config.CORS_ORIGINS_LIST[0] || 'http://localhost:5173';
        const sloUrl = `${baseUrl}/api/v1/auth/sso/saml/logout/${providerId}`;

        const validationResult = await ssoService.validateSAMLResponse(
          SAMLResponse,
          provider,
          sloUrl,
          request.id,
        );

        if (!validationResult.valid) {
          const eventBus = fastify.eventBus;
          eventBus.publish(
            createSSOLogoutFailedEvent({
              source: 'auth-sso-module',
              correlationId: request.id,
              tenantId,
              version: 1,
              payload: {
                tenantId,
                ssoProviderId: providerId,
                providerType: 'saml',
                reason: validationResult.failureReason || 'Invalid SAML logout response',
                errorCode: 'LOGOUT_VALIDATION_FAILED',
                correlationId: request.id,
              },
            }),
          );

          return {
            result: 'failed',
            sessionsRevoked: 0,
            userId: undefined,
            reason: validationResult.failureReason || 'Invalid SAML logout response',
          };
        }

        if (userIdToRevoke) {
          const revocationResult = await authService.revokeUserSessionsByFederatedIdentity(config, {
            tenantId,
            userId: userIdToRevoke,
            sourceType: 'saml',
            ssoProviderId: providerId,
          });

          const eventBus = fastify.eventBus;
          eventBus.publish(
            createSSOLogoutProcessedEvent({
              source: 'auth-sso-module',
              correlationId: request.id,
              tenantId,
              version: 1,
              payload: {
                tenantId,
                ssoProviderId: providerId,
                providerType: 'saml',
                userId: revocationResult.userId || '',
                sessionsRevoked: revocationResult.sessionsRevoked,
                result:
                  revocationResult.result === 'revoked' ||
                  revocationResult.result === 'already_revoked'
                    ? revocationResult.result
                    : 'failed',
                correlationId: request.id,
              },
            }),
          );

          return revocationResult;
        }
      }

      return {
        result: 'ignored_invalid',
        sessionsRevoked: 0,
        userId: undefined,
        reason: 'No valid user session to revoke',
      };
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

      const user = request.user as { userId?: string; tenantId: string } | undefined;
      const { providerId } = request.params;
      const {
        id_token_hint: idTokenHint,
        post_logout_redirect_uri: postLogoutRedirectUri,
        state: logoutState,
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

      let userIdToRevoke: string | undefined;

      if (user?.userId) {
        userIdToRevoke = user.userId;
      }

      // If we have a user ID, revoke their sessions
      if (userIdToRevoke) {
        const revocationResult = await authService.revokeUserSessionsByFederatedIdentity(config, {
          tenantId,
          userId: userIdToRevoke,
          sourceType: 'oidc',
          ssoProviderId: providerId,
        });

        if (revocationResult.result === 'revoked' && revocationResult.userId) {
          eventBus.publish(
            createSSOLogoutProcessedEvent({
              source: 'auth-sso-module',
              correlationId: request.id,
              tenantId,
              version: 1,
              payload: {
                tenantId,
                ssoProviderId: providerId,
                providerType: 'oidc',
                userId: revocationResult.userId || '',
                sessionsRevoked: revocationResult.sessionsRevoked,
                result:
                  revocationResult.result === 'revoked' ||
                  revocationResult.result === 'already_revoked'
                    ? revocationResult.result
                    : 'failed',
                correlationId: request.id,
              },
            }),
          );
        }

        // If provider supports end_session_endpoint, redirect to it
        if (provider.metadataUrl) {
          try {
            const { metadata } = await ssoService.getOIDCProviderConfig(provider);

            if (metadata.endSessionEndpoint && idTokenHint) {
              const logoutUrl = ssoService.buildOIDCLogoutUrl(
                metadata.endSessionEndpoint,
                idTokenHint,
                postLogoutRedirectUri,
                logoutState,
              );

              return {
                result: 'revoked',
                sessionsRevoked: revocationResult.sessionsRevoked,
                userId: revocationResult.userId,
                logoutUrl,
                reason: 'Sessions revoked, redirect to IdP logout',
              };
            }
          } catch {
            // If we can't get metadata, just return the revocation result
          }
        }

        return revocationResult;
      }

      // No user session to revoke
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

      return {
        result: 'ignored_invalid',
        sessionsRevoked: 0,
        userId: undefined,
        reason: 'No valid user session to revoke',
      };
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
