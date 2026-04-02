import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import * as handlers from './campaign.handlers.js';
import * as schemas from './campaign.schemas.js';

import type { FastifyInstance } from 'fastify';

export const registerCampaignRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Body: handlers.CampaignCreateBody }>(
    '/admin/campaigns',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        body: schemas.campaignCreateBodyJsonSchema,
        response: {
          201: schemas.campaignResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleCreateCampaign(request, reply),
  );

  fastify.get<{ Querystring: handlers.CampaignListQuery }>(
    '/admin/campaigns',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        querystring: schemas.campaignListQueryJsonSchema,
        response: {
          200: schemas.campaignListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleListCampaigns(request, reply),
  );

  fastify.get<{ Params: handlers.CampaignParams }>(
    '/admin/campaigns/:campaignId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        response: {
          200: schemas.campaignDetailResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleGetCampaign(request, reply),
  );

  fastify.put<{ Params: handlers.CampaignParams; Body: handlers.CampaignUpdateBody }>(
    '/admin/campaigns/:campaignId',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        body: schemas.campaignUpdateBodyJsonSchema,
        response: {
          200: schemas.campaignResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleUpdateCampaign(request, reply),
  );

  fastify.patch<{ Params: handlers.CampaignParams; Body: handlers.CampaignStatusUpdateBody }>(
    '/admin/campaigns/:campaignId/status',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        body: schemas.campaignStatusUpdateBodyJsonSchema,
        response: {
          200: schemas.campaignResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleUpdateCampaignStatus(request, reply),
  );

  fastify.delete<{ Params: handlers.CampaignParams }>(
    '/admin/campaigns/:campaignId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        response: {
          200: schemas.messageResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleDeleteCampaign(request, reply),
  );

  fastify.post<{ Params: handlers.CampaignParams; Body: handlers.CampaignAudienceBody }>(
    '/admin/campaigns/:campaignId/audience',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        body: schemas.campaignAudienceBodyJsonSchema,
        response: {
          200: schemas.audienceResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleSetCampaignAudience(request, reply),
  );

  fastify.post<{ Params: handlers.CampaignParams; Body: handlers.CampaignContentBody }>(
    '/admin/campaigns/:campaignId/content',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        body: schemas.campaignContentBodyJsonSchema,
        response: {
          201: schemas.contentResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleAddCampaignContent(request, reply),
  );

  fastify.delete<{ Params: handlers.ContentParams }>(
    '/admin/campaigns/:campaignId/content/:contentId',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.contentIdParamJsonSchema,
        response: {
          200: schemas.messageResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleRemoveCampaignContent(request, reply),
  );

  fastify.get<{ Params: handlers.CampaignParams }>(
    '/admin/campaigns/:campaignId/progress',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        response: {
          200: schemas.progressResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleGetCampaignProgress(request, reply),
  );

  fastify.post<{ Params: handlers.CampaignParams; Body: handlers.SaveTemplateBody }>(
    '/admin/campaigns/:campaignId/template',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        body: schemas.saveTemplateBodyJsonSchema,
        response: {
          201: schemas.templateResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleSaveCampaignAsTemplate(request, reply),
  );

  fastify.get(
    '/admin/campaigns/templates',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        response: {
          200: schemas.templateListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleListCampaignTemplates(request, reply),
  );

  fastify.post<{ Body: handlers.CreateFromTemplateBody }>(
    '/admin/campaigns/from-template',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        body: schemas.createFromTemplateBodyJsonSchema,
        response: {
          201: schemas.campaignResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleCreateCampaignFromTemplate(request, reply),
  );

  fastify.delete<{ Params: handlers.TemplateParams }>(
    '/admin/campaigns/templates/:templateId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
      schema: {
        params: schemas.templateIdParamJsonSchema,
        response: {
          200: schemas.messageResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleDeleteCampaignTemplate(request, reply),
  );

  fastify.post<{ Params: handlers.CampaignParams; Body: handlers.EnrollUsersBody }>(
    '/admin/campaigns/:campaignId/enroll',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        body: schemas.enrollUsersBodyJsonSchema,
        response: {
          201: schemas.enrollmentResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleEnrollUsersInCampaign(request, reply),
  );

  fastify.get<{ Params: handlers.CampaignParams }>(
    '/admin/campaigns/:campaignId/eligible-users',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        response: {
          200: schemas.eligibleUsersResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleGetEligibleUsers(request, reply),
  );

  fastify.get<{ Params: handlers.UserParams }>(
    '/admin/campaigns/throttle-check/:userId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: schemas.userIdParamJsonSchema,
        response: {
          200: schemas.throttleCheckResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleThrottleCheck(request, reply),
  );

  fastify.patch<{ Params: handlers.EnrollmentParams; Body: handlers.EnrollmentStatusBody }>(
    '/admin/campaigns/enrollments/:enrollmentId/status',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: schemas.enrollmentIdParamJsonSchema,
        body: schemas.enrollmentStatusUpdateBodyJsonSchema,
        response: {
          200: schemas.enrollmentStatusResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleUpdateEnrollmentStatus(request, reply),
  );

  fastify.post<{ Params: handlers.CampaignParams; Body: handlers.CampaignEscalationBody }>(
    '/admin/campaigns/:campaignId/escalations',
    {
      preHandler: [authGuard, tenantContext, requireRole('trainer', 'tenant_admin', 'super_admin')],
      schema: {
        params: schemas.campaignIdParamJsonSchema,
        body: schemas.campaignEscalationBodyJsonSchema,
        response: {
          200: schemas.escalationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    (request, reply) => handlers.handleSetCampaignEscalations(request, reply),
  );
};
