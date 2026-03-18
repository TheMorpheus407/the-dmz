import { type z } from 'zod';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { authGuard } from '../../shared/middleware/authorization.js';

import {
  createScormPackage,
  listScormPackages,
  getScormPackage,
  deleteScormPackage,
  createScormRegistration,
  updateScormRegistration,
  getScormRegistration,
  listScormRegistrations,
} from './scorm.service.js';
import {
  createScormPackageSchema,
  createRegistrationSchema,
  updateRegistrationSchema,
} from './scorm.schemas.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

export async function registerScormRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.get(
    '/packages',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context not found');
      }

      const packages = await listScormPackages(config, tenantId);

      return packages.map((pkg) => ({
        ...pkg,
        createdAt: pkg.createdAt.toISOString(),
        updatedAt: pkg.updatedAt.toISOString(),
      }));
    },
  );

  app.post(
    '/packages',
    {
      schema: {
        body: createScormPackageSchema,
      },
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context not found');
      }

      const input = request.body as z.infer<typeof createScormPackageSchema>;

      const pkg = await createScormPackage(config, tenantId, {
        ...input,
        description: input.description ?? undefined,
      });

      reply.code(201);
      return {
        ...pkg,
        createdAt: pkg.createdAt.toISOString(),
        updatedAt: pkg.updatedAt.toISOString(),
      };
    },
  );

  app.get(
    '/packages/:packageId',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context not found');
      }

      const { packageId } = request.params as { packageId: string };

      const pkg = await getScormPackage(config, packageId, tenantId);

      if (!pkg) {
        return reply.code(404).send({
          message: 'SCORM package not found',
        });
      }

      return {
        ...pkg,
        createdAt: pkg.createdAt.toISOString(),
        updatedAt: pkg.updatedAt.toISOString(),
      };
    },
  );

  app.delete(
    '/packages/:packageId',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context not found');
      }

      const { packageId } = request.params as { packageId: string };

      await deleteScormPackage(config, packageId, tenantId);
    },
  );

  app.get(
    '/packages/:packageId/registrations',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context not found');
      }

      const { packageId } = request.params as { packageId: string };

      const registrations = await listScormRegistrations(config, packageId, tenantId);

      return registrations.map((reg) => ({
        ...reg,
        lastLaunchedAt: reg.lastLaunchedAt?.toISOString() ?? null,
        createdAt: reg.createdAt.toISOString(),
        updatedAt: reg.updatedAt.toISOString(),
      }));
    },
  );

  app.post(
    '/registrations',
    {
      schema: {
        body: createRegistrationSchema,
      },
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const { packageId, userId } = request.body as z.infer<typeof createRegistrationSchema>;

      const registration = await createScormRegistration(config, packageId, userId);

      reply.code(201);
      return {
        ...registration,
        lastLaunchedAt: registration.lastLaunchedAt?.toISOString() ?? null,
        createdAt: registration.createdAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
      };
    },
  );

  app.get(
    '/registrations/:registrationId',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context not found');
      }

      const { registrationId } = request.params as { registrationId: string };

      const registration = await getScormRegistration(config, registrationId, tenantId);

      if (!registration) {
        return reply.code(404).send({
          message: 'SCORM registration not found',
        });
      }

      return {
        ...registration,
        lastLaunchedAt: registration.lastLaunchedAt?.toISOString() ?? null,
        createdAt: registration.createdAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
      };
    },
  );

  app.patch(
    '/registrations/:registrationId',
    {
      schema: {
        body: updateRegistrationSchema,
      },
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context not found');
      }

      const { registrationId } = request.params as { registrationId: string };
      const updates = request.body as z.infer<typeof updateRegistrationSchema>;

      const registration = await updateScormRegistration(config, registrationId, tenantId, updates);

      if (!registration) {
        return reply.code(404).send({
          message: 'SCORM registration not found',
        });
      }

      return {
        ...registration,
        lastLaunchedAt: registration.lastLaunchedAt?.toISOString() ?? null,
        createdAt: registration.createdAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
      };
    },
  );
}
