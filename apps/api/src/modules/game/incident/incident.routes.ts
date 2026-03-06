import { type IncidentStatus, type ResponseAction } from '@the-dmz/shared/game';

import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
// eslint-disable-next-line import-x/no-restricted-paths
import { authGuard } from '../../auth/auth.routes.js';

import * as incidentService from './incident.service.js';
import * as incidentEvents from './incident.events.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export const registerIncidentRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get(
    '/game/sessions/:sessionId/incidents',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
              data: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, _reply) => {
      const { sessionId } = request.params;

      const incidents = await incidentService.getIncidentsBySession(fastify.db, sessionId);

      return { data: incidents };
    },
  );

  fastify.get(
    '/game/sessions/:sessionId/incidents/active',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
              data: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, _reply) => {
      const { sessionId } = request.params;

      const incidents = await incidentService.getActiveIncidents(fastify.db, sessionId);

      return { data: incidents };
    },
  );

  fastify.get<{ Params: { sessionId: string; incidentId: string } }>(
    '/game/sessions/:sessionId/incidents/:incidentId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            incidentId: { type: 'string', format: 'uuid' },
          },
          required: ['sessionId', 'incidentId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { sessionId: string; incidentId: string } }>,
      reply: FastifyReply,
    ) => {
      const { incidentId } = request.params;

      const incident = await incidentService.getIncidentById(fastify.db, incidentId);

      if (!incident) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found',
            details: {},
          },
        });
      }

      return { data: incident };
    },
  );

  fastify.get<{ Params: { sessionId: string; incidentId: string } }>(
    '/game/sessions/:sessionId/incidents/:incidentId/available-actions',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            incidentId: { type: 'string', format: 'uuid' },
          },
          required: ['sessionId', 'incidentId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { sessionId: string; incidentId: string } }>,
      reply: FastifyReply,
    ) => {
      const { incidentId } = request.params;

      const incident = await incidentService.getIncidentById(fastify.db, incidentId);

      if (!incident) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found',
            details: {},
          },
        });
      }

      const actions = incidentService.getAvailableActions(incident.classification);

      return { data: actions };
    },
  );

  fastify.post<{
    Params: { sessionId: string; incidentId: string };
    Body: { status: IncidentStatus; notes?: string; day: number };
  }>(
    '/game/sessions/:sessionId/incidents/:incidentId/status',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            incidentId: { type: 'string', format: 'uuid' },
          },
          required: ['sessionId', 'incidentId'],
        },
        body: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['open', 'investigating', 'contained', 'eradicated', 'recovered', 'closed'],
            },
            notes: { type: 'string' },
            day: { type: 'integer' },
          },
          required: ['status', 'day'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { sessionId: string; incidentId: string };
        Body: { status: IncidentStatus; notes?: string; day: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { incidentId } = request.params;
      const { status, notes, day } = request.body;

      const incident = await incidentService.getIncidentById(fastify.db, incidentId);

      if (!incident) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found',
            details: {},
          },
        });
      }

      const previousStatus = incident.status;
      const updateParams: {
        db: typeof fastify.db;
        incidentId: string;
        newStatus: IncidentStatus;
        day: number;
        notes?: string;
      } = {
        db: fastify.db,
        incidentId,
        newStatus: status,
        day,
      };
      if (notes) {
        updateParams.notes = notes;
      }
      const updated = await incidentService.updateIncidentStatus(updateParams);

      const eventData: {
        incidentId: string;
        sessionId: string;
        previousStatus: IncidentStatus;
        newStatus: IncidentStatus;
        day: number;
        notes?: string;
      } = {
        incidentId,
        sessionId: incident.sessionId,
        previousStatus,
        newStatus: status,
        day,
      };
      if (notes) {
        eventData.notes = notes;
      }
      await incidentEvents.emitIncidentStatusChanged(fastify.db, eventData);

      return { data: updated };
    },
  );

  fastify.post<{
    Params: { sessionId: string; incidentId: string };
    Body: { actionType: ResponseAction; effectiveness?: number; notes?: string; day: number };
  }>(
    '/game/sessions/:sessionId/incidents/:incidentId/actions',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            incidentId: { type: 'string', format: 'uuid' },
          },
          required: ['sessionId', 'incidentId'],
        },
        body: {
          type: 'object',
          properties: {
            actionType: { type: 'string' },
            effectiveness: { type: 'number', minimum: 0, maximum: 1 },
            notes: { type: 'string' },
            day: { type: 'integer' },
          },
          required: ['actionType', 'day'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { sessionId: string; incidentId: string };
        Body: { actionType: ResponseAction; effectiveness?: number; notes?: string; day: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { incidentId } = request.params;
      const { actionType, effectiveness, notes, day } = request.body;

      const incident = await incidentService.getIncidentById(fastify.db, incidentId);

      if (!incident) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found',
            details: {},
          },
        });
      }

      const actionParams: {
        db: typeof fastify.db;
        incidentId: string;
        actionType: ResponseAction;
        day: number;
        effectiveness: number;
        notes?: string;
      } = {
        db: fastify.db,
        incidentId,
        actionType,
        day,
        effectiveness: effectiveness ?? 0.8,
      };
      if (notes) {
        actionParams.notes = notes;
      }
      const updated = await incidentService.addResponseAction(actionParams);

      const eventData: {
        incidentId: string;
        sessionId: string;
        actionType: ResponseAction;
        effectiveness: number;
        day: number;
        notes?: string;
      } = {
        incidentId,
        sessionId: incident.sessionId,
        actionType,
        effectiveness: effectiveness ?? 0.8,
        day,
      };
      if (notes) {
        eventData.notes = notes;
      }
      await incidentEvents.emitIncidentResponseAction(fastify.db, eventData);

      return { data: updated };
    },
  );

  fastify.post<{
    Params: { sessionId: string; incidentId: string };
    Body: { outcome: string; rootCause?: string; lessonsLearned?: string; day: number };
  }>(
    '/game/sessions/:sessionId/incidents/:incidentId/resolve',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            incidentId: { type: 'string', format: 'uuid' },
          },
          required: ['sessionId', 'incidentId'],
        },
        body: {
          type: 'object',
          properties: {
            outcome: { type: 'string' },
            rootCause: { type: 'string' },
            lessonsLearned: { type: 'string' },
            day: { type: 'integer' },
          },
          required: ['outcome', 'day'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { sessionId: string; incidentId: string };
        Body: { outcome: string; rootCause?: string; lessonsLearned?: string; day: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { incidentId } = request.params;
      const { outcome, rootCause, lessonsLearned } = request.body;

      const incident = await incidentService.getIncidentById(fastify.db, incidentId);

      if (!incident) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found',
            details: {},
          },
        });
      }

      const updated = await incidentService.resolveIncident(
        fastify.db,
        incidentId,
        outcome,
        rootCause,
        lessonsLearned,
      );

      await incidentEvents.emitIncidentResolved(
        fastify.db,
        updated!,
        outcome,
        updated!.resolutionDays || 0,
      );

      return { data: updated };
    },
  );

  fastify.get(
    '/game/sessions/:sessionId/incidents/:incidentId/review',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            incidentId: { type: 'string', format: 'uuid' },
          },
          required: ['sessionId', 'incidentId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { incidentId } = request.params as { sessionId: string; incidentId: string };

      const review = await incidentService.getPostIncidentReview(fastify.db, incidentId);

      if (!review) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found',
            details: {},
          },
        });
      }

      return { data: review };
    },
  );

  fastify.get(
    '/game/sessions/:sessionId/incidents/stats',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, _reply) => {
      const { sessionId } = request.params;

      const stats = await incidentService.getIncidentStats(fastify.db, sessionId);

      return { data: stats };
    },
  );
};
