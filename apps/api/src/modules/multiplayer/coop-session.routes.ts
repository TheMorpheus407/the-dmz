import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  createCoopSession,
  getCoopSession,
  assignRoles,
  rotateAuthority,
  submitProposal,
  authorityConfirm,
  authorityOverride,
  advanceDay,
  endCoopSession,
  abandonCoopSession,
} from './coop-session.service.js';
import {
  getSessionRoleConfig,
  getRolePermissionsForSession,
  overrideSessionRoleConfig,
  type RoleConfigOverrideInput,
  DEFAULT_PERMISSION_MATRIX,
} from './permissions/index.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const coopSessionStatusSchema = z.enum(['lobby', 'active', 'paused', 'completed', 'abandoned']);
const coopRoleSchema = z.enum(['triage_lead', 'verification_lead']);
const authorityActionSchema = z.enum(['confirm', 'override']);
const conflictReasonSchema = z.enum([
  'insufficient_verification',
  'risk_tolerance',
  'factual_dispute',
  'policy_conflict',
]);

const createCoopSessionSchema = z.object({
  partyId: z.string().uuid(),
  seed: z.string().length(32),
});

const assignRolesSchema = z.object({
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
});

const submitProposalSchema = z.object({
  playerId: z.string().uuid(),
  role: coopRoleSchema,
  emailId: z.string().uuid(),
  action: z.string(),
});

const authorityActionInputSchema = z.object({
  proposalId: z.string().uuid(),
  action: authorityActionSchema,
  conflictReason: conflictReasonSchema.optional(),
});

const coopRoleAssignmentResponseSchema = z.object({
  assignmentId: z.string().uuid(),
  playerId: z.string().uuid(),
  role: coopRoleSchema,
  isAuthority: z.boolean(),
  assignedAt: z.string().datetime(),
});

const coopSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  partyId: z.string().uuid(),
  seed: z.string(),
  status: coopSessionStatusSchema,
  authorityPlayerId: z.string().uuid().nullable(),
  dayNumber: z.number(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  roles: z.array(coopRoleAssignmentResponseSchema),
});

const coopSessionResultSchema = z.object({
  success: z.boolean(),
  session: coopSessionResponseSchema,
  error: z.string().optional(),
});

export async function coopSessionRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.post(
    '/api/v1/coop/sessions',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createCoopSessionSchema,
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const input = request.body as z.infer<typeof createCoopSessionSchema>;
      const eventBus = fastify.eventBus;

      const result = await createCoopSession(
        config,
        user.tenantId,
        user.userId,
        {
          partyId: input.partyId,
          seed: input.seed,
        },
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to create co-op session',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.get<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const eventBus = fastify.eventBus;

      const result = await getCoopSession(config, user.tenantId, sessionId, eventBus);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Co-op session not found',
          statusCode: 404,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/roles',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: assignRolesSchema,
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const input = request.body as z.infer<typeof assignRolesSchema>;
      const eventBus = fastify.eventBus;

      const result = await assignRoles(
        config,
        user.tenantId,
        sessionId,
        user.userId,
        {
          player1Id: input.player1Id,
          player2Id: input.player2Id,
        },
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to assign roles',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.put<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/authority',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const eventBus = fastify.eventBus;

      const result = await rotateAuthority(config, user.tenantId, sessionId, user.userId, eventBus);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to rotate authority',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/proposals',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: submitProposalSchema,
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const input = request.body as z.infer<typeof submitProposalSchema>;
      const eventBus = fastify.eventBus;

      const result = await submitProposal(
        config,
        user.tenantId,
        sessionId,
        user.userId,
        {
          playerId: input.playerId,
          role: input.role,
          emailId: input.emailId,
          action: input.action,
        },
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to submit proposal',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/confirm',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: authorityActionInputSchema,
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const input = request.body as z.infer<typeof authorityActionInputSchema>;
      const eventBus = fastify.eventBus;

      const result = await authorityConfirm(
        config,
        user.tenantId,
        sessionId,
        user.userId,
        {
          proposalId: input.proposalId,
          action: input.action,
        },
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to confirm proposal',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/override',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: authorityActionInputSchema,
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const input = request.body as z.infer<typeof authorityActionInputSchema>;
      const eventBus = fastify.eventBus;

      const result = await authorityOverride(
        config,
        user.tenantId,
        sessionId,
        user.userId,
        {
          proposalId: input.proposalId,
          action: input.action,
          conflictReason: input.conflictReason,
        },
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to override proposal',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/advance-day',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const eventBus = fastify.eventBus;

      const result = await advanceDay(config, user.tenantId, sessionId, user.userId, eventBus);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to advance day',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId/end',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const eventBus = fastify.eventBus;

      const result = await endCoopSession(config, user.tenantId, sessionId, user.userId, eventBus);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to end session',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.delete<{ Params: { sessionId: string } }>(
    '/api/v1/coop/sessions/:sessionId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: coopSessionResultSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const eventBus = fastify.eventBus;

      const result = await abandonCoopSession(
        config,
        user.tenantId,
        sessionId,
        user.userId,
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to abandon session',
          statusCode: 400,
        });
      }

      return {
        success: true,
        session: {
          sessionId: result.session!.sessionId,
          tenantId: result.session!.tenantId,
          partyId: result.session!.partyId,
          seed: result.session!.seed,
          status: result.session!.status,
          authorityPlayerId: result.session!.authorityPlayerId,
          dayNumber: result.session!.dayNumber,
          createdAt: result.session!.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: result.session!.completedAt?.toISOString() ?? null,
          roles: result.session!.roles.map((r) => ({
            assignmentId: r.assignmentId,
            playerId: r.playerId,
            role: r.role,
            isAuthority: r.isAuthority,
            assignedAt: r.assignedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.get<{ Params: { sessionId: string } }>(
    '/api/v1/coop/:sessionId/permissions',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            config: z.record(z.unknown()),
            error: z.string().optional(),
          }),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;

      const result = await getSessionRoleConfig(config, user.tenantId, sessionId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Session not found',
          statusCode: 404,
        });
      }

      return {
        success: true,
        config: result.config ?? DEFAULT_PERMISSION_MATRIX,
      };
    },
  );

  fastify.get<{ Params: { sessionId: string; role: string } }>(
    '/api/v1/coop/:sessionId/permissions/:role',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
          role: z.string(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            config: z.record(z.unknown()).optional(),
            error: z.string().optional(),
          }),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId, role } = request.params;

      const validRoles = ['triage_lead', 'verification_lead'] as const;
      if (!validRoles.includes(role as (typeof validRoles)[number])) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Invalid role specified',
          statusCode: 400,
        });
      }

      const result = await getRolePermissionsForSession(
        config,
        user.tenantId,
        sessionId,
        role as 'triage_lead' | 'verification_lead',
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Session not found',
          statusCode: 404,
        });
      }

      return {
        success: true,
        config: result.config,
      };
    },
  );

  fastify.post<{ Params: { sessionId: string } }>(
    '/api/v1/coop/:sessionId/permissions/override',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          sessionId: z.string().uuid(),
        }),
        body: z.object({
          roles: z.record(z.record(z.array(z.string()))).optional(),
          authorityRole: z.string().optional(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            config: z.record(z.unknown()).optional(),
            error: z.string().optional(),
          }),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { sessionId } = request.params;
      const input = request.body as RoleConfigOverrideInput;
      const eventBus = fastify.eventBus;

      const result = await overrideSessionRoleConfig(
        config,
        user.tenantId,
        sessionId,
        user.userId,
        input,
        eventBus,
      );

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to override role config',
          statusCode: 400,
        });
      }

      return {
        success: true,
        config: result.config,
      };
    },
  );
}
