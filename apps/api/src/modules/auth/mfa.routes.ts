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
  totpEnrollmentRequestJsonSchema as totpEnrollmentRequestSchema,
  totpEnrollmentResponseJsonSchema as totpEnrollmentResponseSchema,
  totpVerifyRequestJsonSchema as totpVerifyRequestSchema,
  totpVerifyResponseJsonSchema as totpVerifyResponseSchema,
  mfaVerifyRequestJsonSchema as mfaVerifyRequestSchema,
  mfaVerifyResponseJsonSchema as mfaVerifyResponseSchema,
  backupCodesResponseJsonSchema as backupCodesResponseSchema,
  mfaEnrollmentStatusResponseJsonSchema as mfaEnrollmentStatusSchema,
  mfaDisableRequestJsonSchema as mfaDisableRequestSchema,
} from '@the-dmz/shared/schemas';
import type { WebauthnChallengeRequest } from '@the-dmz/shared/schemas';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import * as mfaService from './mfa.service.js';
import * as totpService from './totp.js';

import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from './auth.types.js';

export const registerMfaRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const config = fastify.config;

  fastify.post<{ Body: WebauthnChallengeRequest }>(
    '/auth/mfa/webauthn/challenge',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
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

  fastify.post(
    '/auth/mfa/totp/enroll',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        response: {
          200: totpEnrollmentResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;

      const enrollment = await totpService.createTotpEnrollment(config, user);

      return enrollment;
    },
  );

  fastify.post(
    '/auth/mfa/totp/enroll/verify',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        body: totpVerifyRequestSchema,
        response: {
          200: totpVerifyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { code, secret, name } = request.body as {
        code: string;
        secret: string;
        name?: string;
      };

      const enrollmentData: { code: string; secret: string; name?: string } = { code, secret };
      if (name) {
        enrollmentData.name = name;
      }

      const result = await totpService.verifyTotpEnrollment(config, user, enrollmentData);

      return result;
    },
  );

  fastify.post(
    '/auth/mfa/verify',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        body: mfaVerifyRequestSchema,
        response: {
          200: mfaVerifyResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { code, method, challengeId } = request.body as {
        code: string;
        method: 'totp' | 'webauthn' | 'backup';
        challengeId?: string;
      };

      let result: { success: boolean; mfaVerifiedAt: Date; method: string };

      if (method === 'totp') {
        result = await totpService.verifyTotpCode(config, user, code);
      } else if (method === 'backup') {
        result = await totpService.verifyBackupCode(config, user, code);
      } else if (method === 'webauthn') {
        if (!challengeId) {
          throw new Error('challengeId is required for WebAuthn verification');
        }
        const webauthnResult = await mfaService.verifyWebauthnAssertion(
          config,
          user,
          { credentialId: '', counter: 0 },
          challengeId,
        );
        result = {
          success: webauthnResult.success,
          mfaVerifiedAt: webauthnResult.mfaVerifiedAt,
          method: 'webauthn',
        };
      } else {
        throw new Error('Invalid MFA method');
      }

      return {
        success: result.success,
        mfaVerifiedAt: result.mfaVerifiedAt.toISOString(),
        method: result.method,
      };
    },
  );

  fastify.post(
    '/auth/mfa/backup-codes/generate',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        response: {
          200: backupCodesResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;

      const result = await totpService.generateBackupCodes(config, user);

      return { codes: result.codes };
    },
  );

  fastify.get(
    '/auth/mfa/enrollment-status',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        response: {
          200: mfaEnrollmentStatusSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;

      const status = await totpService.getMfaEnrollmentStatus(config, user);

      return status;
    },
  );

  fastify.delete(
    '/auth/mfa/disable',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        body: mfaDisableRequestSchema,
        response: {
          204: { type: 'null' },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { method } = request.body as { method: 'totp' | 'webauthn' };

      if (method === 'totp') {
        await totpService.disableTotp(config, user);
      } else if (method === 'webauthn') {
        const credentials = await mfaService.listWebauthnCredentials(config, user);
        for (const cred of credentials) {
          await mfaService.deleteWebauthnCredential(config, user, cred.id);
        }
      }

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
export const totpEnrollmentRequestJsonSchema = totpEnrollmentRequestSchema;
export const totpEnrollmentResponseJsonSchema = totpEnrollmentResponseSchema;
export const totpVerifyRequestJsonSchema = totpVerifyRequestSchema;
export const totpVerifyResponseJsonSchema = totpVerifyResponseSchema;
export const mfaVerifyRequestJsonSchema = mfaVerifyRequestSchema;
export const mfaVerifyResponseJsonSchema = mfaVerifyResponseSchema;
export const backupCodesResponseJsonSchema = backupCodesResponseSchema;
export const mfaEnrollmentStatusResponseJsonSchema = mfaEnrollmentStatusSchema;
export const mfaDisableRequestJsonSchema = mfaDisableRequestSchema;
