import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { validateCsrf } from '../auth/csrf.js'; // eslint-disable-line import-x/no-restricted-paths
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import {
  type RegulatoryRegion,
  type ComplianceCoordinatorContact,
} from '../../shared/database/schema/index.js';

import * as onboardingService from './onboarding.service.js';

const onboardingStatusResponseSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    state: { type: 'object' },
    canProceed: { type: 'boolean' },
    nextStep: { type: ['string', 'null'] },
  },
} as const;

const startOnboardingResponseSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    state: { type: 'object' },
    nextStep: { type: 'string' },
  },
} as const;

const orgProfileBodySchema = {
  type: 'object',
  required: ['name', 'domain', 'industry', 'companySize'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    domain: { type: 'string', minLength: 1, maxLength: 255 },
    industry: { type: 'string', minLength: 1, maxLength: 100 },
    companySize: { type: 'string', minLength: 1, maxLength: 50 },
  },
} as const;

const idpConfigBodySchema = {
  type: 'object',
  required: ['type', 'enabled'],
  properties: {
    type: { type: 'string', enum: ['saml', 'oidc'] },
    enabled: { type: 'boolean' },
    metadataUrl: { type: 'string' },
    entityId: { type: 'string' },
    ssoUrl: { type: 'string' },
    certificate: { type: 'string' },
    clientId: { type: 'string' },
    clientSecret: { type: 'string' },
    issuer: { type: 'string' },
    scopes: { type: 'array', items: { type: 'string' } },
    authorizedDomains: { type: 'array', items: { type: 'string' } },
  },
} as const;

const scimTokenBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    expiresInDays: { type: 'integer', minimum: 1 },
  },
} as const;

const complianceBodySchema = {
  type: 'object',
  required: ['frameworks'],
  properties: {
    frameworks: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'nist_800_50',
          'iso_27001',
          'pci_dss',
          'hipaa',
          'gdpr',
          'soc_2',
          'nis2_article_20',
          'dora_article_5',
        ],
      },
    },
    regulatoryRegion: {
      type: 'string',
      enum: [
        'us_federal',
        'us_state_local',
        'eu',
        'uk',
        'canada',
        'australia',
        'japan',
        'singapore',
        'other',
      ],
    },
    complianceCoordinatorContact: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        phone: { type: 'string', maxLength: 50 },
      },
    },
  },
} as const;

const testConnectionResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    diagnostics: {
      type: 'object',
      properties: {
        metadataValid: { type: 'boolean' },
        entityIdValid: { type: 'boolean' },
        ssoUrlReachable: { type: 'boolean' },
        certificateValid: { type: 'boolean' },
        attributes: {
          type: 'array',
          items: { type: 'string' },
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
} as const;

const orgProfileResponseSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    state: { type: 'object' },
    completed: { type: 'boolean' },
    nextStep: { type: ['string', 'null'] },
  },
} as const;

const idpConfigResponseSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    state: { type: 'object' },
    idpConfig: { type: 'object' },
    completed: { type: 'boolean' },
    nextStep: { type: ['string', 'null'] },
  },
} as const;

const scimTokenResponseSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    state: { type: 'object' },
    tokenId: { type: 'string', format: 'uuid' },
    token: { type: 'string' },
    completed: { type: 'boolean' },
    nextStep: { type: ['string', 'null'] },
  },
} as const;

const complianceResponseSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    state: { type: 'object' },
    frameworks: { type: 'array', items: { type: 'string' } },
    completed: { type: 'boolean' },
    nextStep: { type: ['string', 'null'] },
  },
} as const;

const completeResponseSchema = {
  type: 'object',
  properties: {
    tenantId: { type: 'string', format: 'uuid' },
    state: { type: 'object' },
    completed: { type: 'boolean' },
  },
} as const;

export const registerOnboardingRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/admin/onboarding/steps',
    {
      preHandler: [authGuard, tenantContext, requirePermission('tenant', 'read')],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: onboardingStatusResponseSchema,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const status = await onboardingService.getOnboardingStatus(ctx.tenantId);
        return status;
      } catch (error) {
        if (error instanceof onboardingService.OnboardingError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to get onboarding status');
      }
    },
  );

  fastify.post(
    '/admin/onboarding/start',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('tenant', 'write'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: startOnboardingResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await onboardingService.startOnboarding(ctx.tenantId, ctx.userId);
        return result;
      } catch (error) {
        if (error instanceof onboardingService.OnboardingError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to start onboarding');
      }
    },
  );

  fastify.put(
    '/admin/onboarding/org-profile',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('tenant', 'write'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: orgProfileBodySchema,
        response: {
          200: orgProfileResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as {
        name: string;
        domain: string;
        industry: string;
        companySize: string;
      };

      try {
        const result = await onboardingService.saveOrgProfile(ctx.tenantId, ctx.userId, body);
        return result;
      } catch (error) {
        if (error instanceof onboardingService.OnboardingError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to save org profile');
      }
    },
  );

  fastify.put(
    '/admin/onboarding/idp-config',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('tenant', 'write'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: idpConfigBodySchema,
        response: {
          200: idpConfigResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as {
        type: 'saml' | 'oidc';
        enabled: boolean;
        metadataUrl?: string;
        entityId?: string;
        ssoUrl?: string;
        certificate?: string;
        clientId?: string;
        clientSecret?: string;
        issuer?: string;
        scopes?: string[];
        authorizedDomains?: string[];
      };

      try {
        const result = await onboardingService.saveIdpConfig(ctx.tenantId, ctx.userId, body);
        return result;
      } catch (error) {
        if (error instanceof onboardingService.OnboardingError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to save IdP config');
      }
    },
  );

  fastify.post(
    '/admin/onboarding/test-connection',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('tenant', 'read'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: idpConfigBodySchema,
        response: {
          200: testConnectionResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as {
        type: 'saml' | 'oidc';
        enabled: boolean;
        metadataUrl?: string;
        entityId?: string;
        ssoUrl?: string;
        certificate?: string;
        clientId?: string;
        clientSecret?: string;
        issuer?: string;
        scopes?: string[];
        authorizedDomains?: string[];
      };

      try {
        const result = await onboardingService.testIdpConnection(ctx.tenantId, body);
        return result;
      } catch (error) {
        if (error instanceof onboardingService.OnboardingError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to test IdP connection');
      }
    },
  );

  fastify.post(
    '/admin/onboarding/scim-token',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('scim', 'write'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: scimTokenBodySchema,
        response: {
          200: scimTokenResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as { name: string; expiresInDays?: number };
      const { name } = body;
      const result = await onboardingService.generateScimToken(ctx.tenantId, ctx.userId, name);
      return result;
    },
  );

  fastify.put(
    '/admin/onboarding/compliance',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('tenant', 'write'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        body: complianceBodySchema,
        response: {
          200: complianceResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as {
        frameworks: string[];
        regulatoryRegion?: string;
        complianceCoordinatorContact?: {
          name: string;
          email: string;
          phone?: string;
        };
      };
      const { frameworks, regulatoryRegion, complianceCoordinatorContact } = body;
      const result = await onboardingService.saveComplianceFrameworks(ctx.tenantId, ctx.userId, {
        frameworks,
        regulatoryRegion: regulatoryRegion as RegulatoryRegion | undefined,
        complianceCoordinatorContact: complianceCoordinatorContact as
          | ComplianceCoordinatorContact
          | undefined,
      });
      return result;
    },
  );

  fastify.post(
    '/admin/onboarding/complete',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('tenant', 'write'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: completeResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await onboardingService.completeOnboarding(ctx.tenantId, ctx.userId);
        return result;
      } catch (error) {
        if (error instanceof onboardingService.OnboardingError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to complete onboarding');
      }
    },
  );

  fastify.post(
    '/admin/onboarding/reset',
    {
      preHandler: [
        authGuard,
        tenantContext,
        tenantStatusGuard,
        validateCsrf,
        requirePermission('tenant', 'write'),
      ],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: startOnboardingResponseSchema,
          400: errorResponseSchemas.BadRequest,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.tenantContext;

      if (!ctx) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await onboardingService.resetOnboarding(ctx.tenantId, ctx.userId);
        return result;
      } catch (error) {
        if (error instanceof onboardingService.OnboardingError) {
          return reply.code(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to reset onboarding');
      }
    },
  );
};
