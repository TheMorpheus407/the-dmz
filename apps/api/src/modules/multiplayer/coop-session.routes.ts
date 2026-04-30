import { registerLifecycleRoutes } from './routes/lifecycle.routes.js';
import { registerRolesRoutes } from './routes/roles.routes.js';
import { registerSessionRoutes } from './routes/session.routes.js';
import { registerProposalsRoutes } from './routes/proposals.routes.js';
import { registerPermissionsRoutes } from './routes/permissions.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

export async function coopSessionRoutes(
  fastify: FastifyInstance,
  _config: AppConfig,
): Promise<void> {
  await registerLifecycleRoutes(fastify);
  await registerRolesRoutes(fastify);
  await registerSessionRoutes(fastify);
  await registerProposalsRoutes(fastify);
  await registerPermissionsRoutes(fastify);
}
