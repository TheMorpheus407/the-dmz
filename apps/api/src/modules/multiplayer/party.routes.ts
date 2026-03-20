import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  createParty,
  joinPartyByInviteCode,
  leaveParty,
  toggleReadyStatus,
  setDeclaredRole,
  launchParty,
  getParty,
  disbandParty,
  regenerateInviteCode,
} from './party.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const partyStatusSchema = z.enum(['forming', 'ready', 'in_session', 'disbanded']);
const difficultySchema = z.enum(['training', 'standard', 'hardened', 'nightmare']);
const declaredRoleSchema = z.enum(['triage_lead', 'verification_lead', 'any']);

const createPartySchema = z.object({
  difficulty: difficultySchema.optional(),
  preferredRole: declaredRoleSchema.optional(),
});

const joinPartySchema = z.object({
  inviteCode: z.string().length(8),
});

const setRoleSchema = z.object({
  declaredRole: declaredRoleSchema,
});

const partyMemberResponseSchema = z.object({
  partyMemberId: z.string().uuid(),
  playerId: z.string().uuid(),
  role: z.enum(['leader', 'member']),
  readyStatus: z.boolean(),
  declaredRole: declaredRoleSchema.nullable(),
  joinedAt: z.string().datetime(),
});

const partyResponseSchema = z.object({
  partyId: z.string().uuid(),
  tenantId: z.string().uuid(),
  leaderId: z.string().uuid(),
  status: partyStatusSchema,
  preferredRole: declaredRoleSchema.nullable(),
  difficulty: difficultySchema,
  inviteCode: z.string().length(8).nullable(),
  inviteCodeExpiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  members: z.array(partyMemberResponseSchema),
});

const createPartyResponseSchema = z.object({
  success: z.boolean(),
  party: partyResponseSchema,
  error: z.string().optional(),
});

export async function partyRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.post(
    '/api/v1/parties',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: createPartySchema,
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const input = request.body as z.infer<typeof createPartySchema>;

      const result = await createParty(config, user.tenantId, user.userId, {
        ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
        ...(input.preferredRole !== undefined && { preferredRole: input.preferredRole }),
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to create party',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId/join',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        body: joinPartySchema,
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { inviteCode } = request.body as z.infer<typeof joinPartySchema>;

      const result = await joinPartyByInviteCode(config, user.tenantId, user.userId, {
        inviteCode,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to join party',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.delete<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId/leave',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { partyId } = request.params;

      const result = await leaveParty(config, user.tenantId, user.userId, partyId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to leave party',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId/ready',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { partyId } = request.params;

      const result = await toggleReadyStatus(config, user.tenantId, user.userId, partyId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to toggle ready status',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.put<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId/role',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        body: setRoleSchema,
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { partyId } = request.params;
      const { declaredRole } = request.body as z.infer<typeof setRoleSchema>;

      const result = await setDeclaredRole(config, user.tenantId, user.userId, partyId, {
        declaredRole,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to set role',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId/launch',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { partyId } = request.params;

      const result = await launchParty(config, user.tenantId, user.userId, partyId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to launch party',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.get<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { partyId } = request.params;

      const result = await getParty(config, user.tenantId, partyId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error ?? 'Party not found',
          statusCode: 404,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.delete<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { partyId } = request.params;

      const result = await disbandParty(config, user.tenantId, user.userId, partyId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to disband party',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );

  fastify.post<{ Params: { partyId: string } }>(
    '/api/v1/parties/:partyId/regenerate-invite',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          partyId: z.string().uuid(),
        }),
        response: {
          200: createPartyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { partyId } = request.params;

      const result = await regenerateInviteCode(config, user.tenantId, user.userId, partyId);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to regenerate invite code',
          statusCode: 400,
        });
      }

      return {
        success: true,
        party: {
          partyId: result.party!.partyId,
          tenantId: result.party!.tenantId,
          leaderId: result.party!.leaderId,
          status: result.party!.status,
          preferredRole: result.party!.preferredRole,
          difficulty: result.party!.difficulty,
          inviteCode: result.party!.inviteCode,
          inviteCodeExpiresAt: result.party!.inviteCodeExpiresAt?.toISOString() ?? null,
          createdAt: result.party!.createdAt.toISOString(),
          updatedAt: result.party!.updatedAt.toISOString(),
          members: result.party!.members.map((m) => ({
            partyMemberId: m.partyMemberId,
            playerId: m.playerId,
            role: m.role,
            readyStatus: m.readyStatus,
            declaredRole: m.declaredRole,
            joinedAt: m.joinedAt.toISOString(),
          })),
        },
      };
    },
  );
}
