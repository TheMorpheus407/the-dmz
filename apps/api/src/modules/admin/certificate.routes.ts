import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { isRegulatoryFramework, REGULATORY_FRAMEWORKS } from '@the-dmz/shared';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';

import {
  generateCertificate,
  listCertificates,
  getCertificateById,
  getCertificatePDF,
  bulkGenerateCertificates,
  type CertificateInput,
} from './certificate.service.js';

const certificateGenerateSchema = z.object({
  userId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  frameworkId: z.string().refine((val) => isRegulatoryFramework(val), {
    message: `Invalid framework. Must be one of: ${REGULATORY_FRAMEWORKS.join(', ')}`,
  }),
  courseName: z.string().min(1).max(255),
  userName: z.string().min(1).max(128),
});

const certificateBulkGenerateSchema = z.object({
  certificates: z.array(certificateGenerateSchema).min(1).max(100),
});

const certificateListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  frameworkId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

interface CertificateGenerateBody {
  userId: string;
  campaignId?: string;
  frameworkId: string;
  courseName: string;
  userName: string;
}

interface CertificateBulkGenerateBody {
  certificates: CertificateGenerateBody[];
}

interface CertificateListQuery {
  userId?: string;
  campaignId?: string;
  frameworkId?: string;
  limit?: number;
  offset?: number;
}

interface CertificateParams {
  certificateId: string;
}

export const registerCertificateRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Querystring: CertificateListQuery }>(
    '/admin/certificates',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            campaignId: { type: 'string', format: 'uuid' },
            frameworkId: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: CertificateListQuery }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const queryResult = certificateListQuerySchema.parse(request.query);

        const query: CertificateListQuery = {};
        if (queryResult.userId !== undefined) query.userId = queryResult.userId;
        if (queryResult.campaignId !== undefined) query.campaignId = queryResult.campaignId;
        if (queryResult.frameworkId !== undefined) query.frameworkId = queryResult.frameworkId;
        if (queryResult.limit !== undefined) query.limit = queryResult.limit;
        if (queryResult.offset !== undefined) query.offset = queryResult.offset;

        const result = await listCertificates(tenantId, query);

        return reply.code(200).send({
          success: true,
          data: {
            certificates: result.certificates.map((cert) => ({
              certificateId: cert.certificateId,
              userId: cert.userId,
              campaignId: cert.campaignId,
              frameworkId: cert.frameworkId,
              courseName: cert.courseName,
              issuedAt: cert.issuedAt.toISOString(),
              expiresAt: cert.expiresAt?.toISOString() ?? null,
              createdAt: cert.createdAt.toISOString(),
            })),
            total: result.total,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CERTIFICATE_LIST_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Params: CertificateParams }>(
    '/admin/certificates/:certificateId',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: {
          type: 'object',
          properties: {
            certificateId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: CertificateParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { certificateId } = request.params;

        const certificate = await getCertificateById(tenantId, certificateId);

        if (!certificate) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'CERTIFICATE_NOT_FOUND',
              message: 'Certificate not found',
            },
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            certificateId: certificate.certificateId,
            userId: certificate.userId,
            campaignId: certificate.campaignId,
            frameworkId: certificate.frameworkId,
            courseName: certificate.courseName,
            issuedAt: certificate.issuedAt.toISOString(),
            expiresAt: certificate.expiresAt?.toISOString() ?? null,
            signatureHash: certificate.signatureHash,
            metadata: certificate.metadata,
            createdAt: certificate.createdAt.toISOString(),
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CERTIFICATE_GET_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Params: CertificateParams }>(
    '/admin/certificates/:certificateId/pdf',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        params: {
          type: 'object',
          properties: {
            certificateId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: CertificateParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { certificateId } = request.params;

        const pdfBuffer = await getCertificatePDF(tenantId, certificateId);

        if (!pdfBuffer) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'CERTIFICATE_NOT_FOUND',
              message: 'Certificate not found',
            },
          });
        }

        reply.header('Content-Type', 'application/pdf');
        reply.header(
          'Content-Disposition',
          `attachment; filename="certificate-${certificateId}.pdf"`,
        );
        reply.header('X-Download-Options', 'noopen');

        return reply.send(pdfBuffer);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CERTIFICATE_PDF_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.post<{ Body: CertificateGenerateBody }>(
    '/admin/certificates/generate',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'frameworkId', 'courseName', 'userName'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            campaignId: { type: 'string', format: 'uuid' },
            frameworkId: { type: 'string' },
            courseName: { type: 'string', minLength: 1, maxLength: 255 },
            userName: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CertificateGenerateBody }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const input = certificateGenerateSchema.parse(request.body);

        const certificateInput: CertificateInput = {
          userId: input.userId,
          frameworkId: input.frameworkId,
          courseName: input.courseName,
          userName: input.userName,
        };
        if (input.campaignId !== undefined) {
          certificateInput.campaignId = input.campaignId;
        }

        const certificate = await generateCertificate(tenantId, certificateInput);

        return reply.code(201).send({
          success: true,
          data: {
            certificateId: certificate.certificateId,
            userId: certificate.userId,
            campaignId: certificate.campaignId,
            frameworkId: certificate.frameworkId,
            courseName: certificate.courseName,
            issuedAt: certificate.issuedAt.toISOString(),
            expiresAt: certificate.expiresAt?.toISOString() ?? null,
            createdAt: certificate.createdAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: error.errors,
            },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CERTIFICATE_GENERATE_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.post<{ Body: CertificateBulkGenerateBody }>(
    '/admin/certificates/bulk-generate',
    {
      preHandler: [
        authGuard,
        tenantContext,
        requireRole('trainer', 'manager', 'tenant_admin', 'super_admin'),
      ],
      schema: {
        body: {
          type: 'object',
          required: ['certificates'],
          properties: {
            certificates: {
              type: 'array',
              minItems: 1,
              maxItems: 100,
              items: {
                type: 'object',
                required: ['userId', 'frameworkId', 'courseName', 'userName'],
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  campaignId: { type: 'string', format: 'uuid' },
                  frameworkId: { type: 'string' },
                  courseName: { type: 'string', minLength: 1, maxLength: 255 },
                  userName: { type: 'string', minLength: 1, maxLength: 128 },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CertificateBulkGenerateBody }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const input = certificateBulkGenerateSchema.parse(request.body);

        const certificateInputs: CertificateInput[] = input.certificates.map((c) => {
          const certInput: CertificateInput = {
            userId: c.userId,
            frameworkId: c.frameworkId,
            courseName: c.courseName,
            userName: c.userName,
          };
          if (c.campaignId !== undefined) {
            certInput.campaignId = c.campaignId;
          }
          return certInput;
        });

        const certificates = await bulkGenerateCertificates(tenantId, certificateInputs);

        return reply.code(201).send({
          success: true,
          data: {
            generated: certificates.length,
            failed: input.certificates.length - certificates.length,
            certificates: certificates.map((cert) => ({
              certificateId: cert.certificateId,
              userId: cert.userId,
              courseName: cert.courseName,
              issuedAt: cert.issuedAt.toISOString(),
            })),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: error.errors,
            },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'CERTIFICATE_BULK_GENERATE_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );
};
