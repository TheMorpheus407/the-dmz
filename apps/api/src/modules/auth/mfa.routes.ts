import {
  webauthnChallengeRequestJsonSchema as challengeRequestSchema,
  webauthnChallengeResponseJsonSchema as challengeResponseSchema,
  webauthnRegistrationResponseJsonSchema as registrationResponseSchema,
  webauthnVerificationResponseJsonSchema as verificationResponseSchema,
  mfaStatusResponseJsonSchema as mfaStatusSchema,
  webauthnCredentialsListResponseJsonSchema as credentialsListSchema,
  mfaMethodJsonSchema as sharedMfaMethodJsonSchema,
  mfaChallengeStateJsonSchema as sharedMfaChallengeStateJsonSchema,
  webauthnCredentialJsonSchema as sharedWebauthnCredentialJsonSchema,
  webauthnRegistrationRequestJsonSchema as registrationRequestSchema,
  webauthnVerificationRequestJsonSchema as verificationRequestSchema,
} from '@the-dmz/shared/schemas';
import type { WebauthnChallengeRequest } from '@the-dmz/shared/schemas';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import * as mfaService from './mfa.service.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedUser } from './auth.types.js';

export const registerMfaRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post<{ Body: WebauthnChallengeRequest }>(
    '/auth/mfa/webauthn/challenge',
    {
      preHandler: [
        async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
          const authHeader = request.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
          }

          const bearerValue = authHeader.substring(7);

          const { verifyAccessToken } = await import('./auth.service.js');
          try {
            const user = await verifyAccessToken(config, bearerValue);
            request.user = user;
          } catch {
            throw new Error('Invalid or expired token');
          }
        },
        tenantContext,
        tenantStatusGuard,
      ],
      schema: {
        body: webauthnChallengeRequestJsonSchema,
        response: {
          200: webauthnChallengeResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { challengeType } = request.body;

      const challenge = await mfaService.createWebauthnChallenge(config, user, challengeType);

      return challenge;
    },
  );

  fastify.post<{ Body: { credential: unknown; challengeId: string } }>(
    '/auth/mfa/webauthn/register',
    {
      preHandler: [
        async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
          const authHeader = request.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
          }

          const bearerValue = authHeader.substring(7);

          const { verifyAccessToken } = await import('./auth.service.js');
          try {
            const user = await verifyAccessToken(config, bearerValue);
            request.user = user;
          } catch {
            throw new Error('Invalid or expired token');
          }
        },
        tenantContext,
        tenantStatusGuard,
      ],
      schema: {
        body: {
          type: 'object',
          properties: {
            credential: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                rawId: { type: 'string' },
                type: { type: 'string', enum: ['public-key'] },
                response: {
                  type: 'object',
                  properties: {
                    clientDataJSON: { type: 'string' },
                    attestationObject: { type: 'string' },
                    transports: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['clientDataJSON', 'attestationObject'],
                },
              },
              required: ['id', 'rawId', 'type', 'response'],
            },
            challengeId: { type: 'string', format: 'uuid' },
          },
          required: ['credential', 'challengeId'],
        },
        response: {
          200: webauthnRegistrationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          409: errorResponseSchemas.Conflict,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { credential, challengeId } = request.body as {
        credential: {
          id: string;
          rawId: string;
          type: 'public-key';
          response: {
            clientDataJSON: string;
            attestationObject: string;
            transports?: string[];
          };
        };
        challengeId: string;
      };

      const attestationObject = Buffer.from(credential.response.attestationObject, 'base64');

      const result = await mfaService.registerWebauthnCredential(
        config,
        user,
        {
          credentialId: credential.id,
          publicKey: attestationObject.toString('base64'),
          counter: 0,
          transports: credential.response.transports,
        },
        challengeId,
      );

      return { success: true, credentialId: result.credentialId };
    },
  );

  fastify.post<{ Body: { credential: unknown; challengeId: string } }>(
    '/auth/mfa/webauthn/verify',
    {
      preHandler: [
        async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
          const authHeader = request.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
          }

          const bearerValue = authHeader.substring(7);

          const { verifyAccessToken } = await import('./auth.service.js');
          try {
            const user = await verifyAccessToken(config, bearerValue);
            request.user = user;
          } catch {
            throw new Error('Invalid or expired token');
          }
        },
        tenantContext,
        tenantStatusGuard,
      ],
      schema: {
        body: {
          type: 'object',
          properties: {
            credential: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                rawId: { type: 'string' },
                type: { type: 'string', enum: ['public-key'] },
                response: {
                  type: 'object',
                  properties: {
                    clientDataJSON: { type: 'string' },
                    authenticatorData: { type: 'string' },
                    signature: { type: 'string' },
                    userHandle: { type: 'string' },
                  },
                  required: ['clientDataJSON', 'authenticatorData', 'signature'],
                },
              },
              required: ['id', 'rawId', 'type', 'response'],
            },
            challengeId: { type: 'string', format: 'uuid' },
          },
          required: ['credential', 'challengeId'],
        },
        response: {
          200: webauthnVerificationResponseJsonSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { credential, challengeId } = request.body as {
        credential: {
          id: string;
          rawId: string;
          type: 'public-key';
          response: {
            clientDataJSON: string;
            authenticatorData: string;
            signature: string;
            userHandle?: string;
          };
        };
        challengeId: string;
      };

      const result = await mfaService.verifyWebauthnAssertion(
        config,
        user,
        {
          credentialId: credential.id,
          counter: 0,
        },
        challengeId,
      );

      return {
        success: result.success,
        mfaVerifiedAt: result.mfaVerifiedAt.toISOString(),
      };
    },
  );

  fastify.get(
    '/auth/mfa/status',
    {
      preHandler: [
        async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
          const authHeader = request.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
          }

          const bearerValue = authHeader.substring(7);

          const { verifyAccessToken } = await import('./auth.service.js');
          try {
            const user = await verifyAccessToken(config, bearerValue);
            request.user = user;
          } catch {
            throw new Error('Invalid or expired token');
          }
        },
        tenantContext,
        tenantStatusGuard,
      ],
      schema: {
        response: {
          200: mfaStatusResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const status = await mfaService.getMfaStatus(config, user);

      return {
        mfaRequired: status.mfaRequired,
        mfaVerified: status.mfaVerified,
        method: status.method,
        mfaVerifiedAt: status.mfaVerifiedAt?.toISOString() ?? null,
        hasCredentials: status.hasCredentials,
      };
    },
  );

  fastify.get(
    '/auth/mfa/webauthn/credentials',
    {
      preHandler: [
        async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
          const authHeader = request.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
          }

          const bearerValue = authHeader.substring(7);

          const { verifyAccessToken } = await import('./auth.service.js');
          try {
            const user = await verifyAccessToken(config, bearerValue);
            request.user = user;
          } catch {
            throw new Error('Invalid or expired token');
          }
        },
        tenantContext,
        tenantStatusGuard,
      ],
      schema: {
        response: {
          200: webauthnCredentialsListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          429: errorResponseSchemas.RateLimitExceeded,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const credentials = await mfaService.listWebauthnCredentials(config, user);

      return {
        credentials: credentials.map((c) => ({
          id: c.id,
          credentialId: c.credentialId,
          transports: c.transports,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    },
  );

  fastify.delete<{ Params: { credentialId: string } }>(
    '/auth/mfa/webauthn/credentials/:credentialId',
    {
      preHandler: [
        async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
          const authHeader = request.headers.authorization;

          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
          }

          const bearerValue = authHeader.substring(7);

          const { verifyAccessToken } = await import('./auth.service.js');
          try {
            const user = await verifyAccessToken(config, bearerValue);
            request.user = user;
          } catch {
            throw new Error('Invalid or expired token');
          }
        },
        tenantContext,
        tenantStatusGuard,
      ],
      schema: {
        params: {
          type: 'object',
          properties: {
            credentialId: { type: 'string', format: 'uuid' },
          },
          required: ['credentialId'],
        },
        response: {
          204: { type: 'null' },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          404: errorResponseSchemas.NotFound,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { credentialId } = request.params;

      await mfaService.deleteWebauthnCredential(config, user, credentialId);

      return reply.code(204);
    },
  );
};

export const mfaMethodJsonSchema = sharedMfaMethodJsonSchema;
export const mfaChallengeStateJsonSchema = sharedMfaChallengeStateJsonSchema;
export const webauthnCredentialJsonSchema = sharedWebauthnCredentialJsonSchema;
export const webauthnChallengeRequestJsonSchema = challengeRequestSchema;
export const webauthnChallengeResponseJsonSchema = challengeResponseSchema;
export const webauthnRegistrationRequestJsonSchema = registrationRequestSchema;
export const webauthnVerificationRequestJsonSchema = verificationRequestSchema;
export const webauthnRegistrationResponseJsonSchema = registrationResponseSchema;
export const webauthnVerificationResponseJsonSchema = verificationResponseSchema;
export const mfaStatusResponseJsonSchema = mfaStatusSchema;
export const webauthnCredentialsListResponseJsonSchema = credentialsListSchema;
