import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import * as narrativeService from './narrative.service.js';

import type { AuthenticatedUser } from '../auth/index.js';
import type { FastifyInstance } from 'fastify';

const protectedRoutePreHandlers = [authGuard, tenantContext, tenantStatusGuard];
const narrativeReadRoutePreHandlers = [
  ...protectedRoutePreHandlers,
  requirePermission('admin', 'read'),
];

export const registerNarrativeRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.get(
    '/narrative/factions',
    {
      preHandler: narrativeReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            factionKey: { type: 'string' },
            isActive: { type: 'boolean' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    factionKey: { type: 'string' },
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    motivations: { type: 'string' },
                    communicationStyle: { type: 'string' },
                    initialReputation: { type: 'integer' },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        factionKey?: string;
        isActive?: boolean;
      };

      const factions = await narrativeService.listFactions(config, user.tenantId, query);

      return { data: factions };
    },
  );

  fastify.get(
    '/narrative/factions/:factionKey',
    {
      preHandler: narrativeReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            factionKey: { type: 'string' },
          },
          required: ['factionKey'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  factionKey: { type: 'string' },
                  displayName: { type: 'string' },
                  description: { type: 'string' },
                  motivations: { type: 'string' },
                  communicationStyle: { type: 'string' },
                  initialReputation: { type: 'integer' },
                  metadata: { type: 'object' },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { factionKey } = request.params as { factionKey: string };

      const faction = await narrativeService.getFaction(config, user.tenantId, factionKey);

      if (!faction) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'FACTION_NOT_FOUND',
            message: 'Faction not found',
            details: {},
          },
        });
      }

      return { data: faction };
    },
  );

  fastify.get(
    '/narrative/relations',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    factionId: { type: 'string', format: 'uuid' },
                    reputation: { type: 'integer' },
                    lastInteractionDay: { type: 'integer' },
                    interactionCount: { type: 'integer' },
                  },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const relations = await narrativeService.getFactionRelations(
        config,
        user.tenantId,
        user.userId,
      );

      return { data: relations };
    },
  );

  fastify.patch(
    '/narrative/relations/:factionId',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            factionId: { type: 'string', format: 'uuid' },
          },
          required: ['factionId'],
        },
        body: {
          type: 'object',
          properties: {
            reputationDelta: { type: 'integer' },
            currentDay: { type: 'integer' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  factionId: { type: 'string', format: 'uuid' },
                  reputation: { type: 'integer' },
                  lastInteractionDay: { type: 'integer' },
                  interactionCount: { type: 'integer' },
                },
              },
            },
          },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { factionId } = request.params as { factionId: string };
      const body = request.body as {
        reputationDelta?: number;
        currentDay?: number;
      };

      if (body.reputationDelta === undefined || body.currentDay === undefined) {
        return _reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'reputationDelta and currentDay are required',
            details: {},
          },
        });
      }

      const relation = await narrativeService.updateFactionRelation(
        config,
        user.tenantId,
        user.userId,
        factionId,
        body.reputationDelta,
        body.currentDay,
      );

      if (!relation) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'RELATION_NOT_FOUND',
            message: 'Faction relation not found',
            details: {},
          },
        });
      }

      return { data: relation };
    },
  );

  fastify.get(
    '/narrative/coaching',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            triggerType: { type: 'string' },
            day: { type: 'integer' },
            trustScore: { type: 'integer' },
            threatLevel: { type: 'string', enum: ['low', 'guarded', 'elevated', 'high', 'severe'] },
            factionKey: { type: 'string' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    messageKey: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    triggerType: { type: 'string' },
                    severity: { type: 'string' },
                  },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        triggerType?: string;
        day?: number;
        trustScore?: number;
        threatLevel?: string;
        factionKey?: string;
      };

      const messages = await narrativeService.getCoachingMessages(config, user.tenantId, query);

      return { data: messages };
    },
  );

  fastify.get(
    '/narrative/events',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            eventKey: { type: 'string' },
            factionKey: { type: 'string' },
            isRead: { type: 'boolean' },
            triggerType: { type: 'string' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    eventKey: { type: 'string' },
                    factionKey: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    triggerType: { type: 'string' },
                    triggerThreshold: { type: 'integer' },
                    dayTriggered: { type: 'integer' },
                    isRead: { type: 'boolean' },
                  },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as {
        eventKey?: string;
        factionKey?: string;
        isRead?: boolean;
        triggerType?: string;
      };

      const events = await narrativeService.getNarrativeEvents(
        config,
        user.tenantId,
        user.userId,
        query,
      );

      return { data: events };
    },
  );

  fastify.post(
    '/narrative/events',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['eventKey', 'title', 'description', 'triggerType', 'dayTriggered'],
          properties: {
            eventKey: { type: 'string', maxLength: 100 },
            factionKey: { type: 'string', maxLength: 50 },
            title: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            triggerType: { type: 'string' },
            triggerThreshold: { type: 'integer' },
            dayTriggered: { type: 'integer' },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  eventKey: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  triggerType: { type: 'string' },
                  dayTriggered: { type: 'integer' },
                  isRead: { type: 'boolean' },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as {
        eventKey: string;
        factionKey?: string;
        title: string;
        description: string;
        triggerType: string;
        triggerThreshold?: number;
        dayTriggered: number;
        metadata?: Record<string, unknown>;
      };

      const eventData: {
        eventKey: string;
        factionKey?: string;
        title: string;
        description: string;
        triggerType: string;
        triggerThreshold?: number;
        dayTriggered: number;
        metadata?: Record<string, unknown>;
      } = {
        eventKey: body.eventKey,
        title: body.title,
        description: body.description,
        triggerType: body.triggerType,
        dayTriggered: body.dayTriggered,
      };

      if (body.factionKey !== undefined) {
        eventData.factionKey = body.factionKey;
      }
      if (body.triggerThreshold !== undefined) {
        eventData.triggerThreshold = body.triggerThreshold;
      }
      if (body.metadata !== undefined) {
        eventData.metadata = body.metadata;
      }

      const event = await narrativeService.triggerNarrativeEvent(
        config,
        user.tenantId,
        user.userId,
        eventData,
      );

      return _reply.status(201).send({ data: event });
    },
  );

  fastify.patch(
    '/narrative/events/:eventId/read',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            eventId: { type: 'string', format: 'uuid' },
          },
          required: ['eventId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  isRead: { type: 'boolean' },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { eventId } = request.params as { eventId: string };

      const event = await narrativeService.markEventRead(
        config,
        user.tenantId,
        user.userId,
        eventId,
      );

      if (!event) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Narrative event not found',
            details: {},
          },
        });
      }

      return { data: event };
    },
  );

  fastify.get(
    '/narrative/state',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  currentSeason: { type: 'integer' },
                  currentChapter: { type: 'integer' },
                  currentAct: { type: 'integer' },
                  milestonesReached: { type: 'array', items: { type: 'string' } },
                  welcomeMessageShown: { type: 'boolean' },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const state = await narrativeService.getPlayerNarrativeState(
        config,
        user.tenantId,
        user.userId,
      );

      if (!state) {
        const { playerState } = await narrativeService.initializePlayerNarrative(
          config,
          user.tenantId,
          user.userId,
        );
        return { data: playerState };
      }

      return { data: state };
    },
  );

  fastify.post(
    '/narrative/welcome',
    {
      preHandler: protectedRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      messageKey: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      triggerType: { type: 'string' },
                      severity: { type: 'string' },
                    },
                  },
                  playerState: {
                    type: 'object',
                    properties: {
                      welcomeMessageShown: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: { oneOf: [errorResponseSchemas.TenantInactive, errorResponseSchemas.Forbidden] },
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const result = await narrativeService.showWelcomeMessage(config, user.tenantId, user.userId);

      return { data: result };
    },
  );
};
