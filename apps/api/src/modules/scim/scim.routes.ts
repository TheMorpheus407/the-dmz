import { registerServiceProviderConfigRoutes } from './scim.service-provider.routes.js';
import { registerSchemasRoutes } from './scim.schemas.routes.js';
import { registerResourceTypesRoutes } from './scim.resource-types.routes.js';
import { registerUsersRoutes } from './scim.users.routes.js';
import { registerGroupsRoutes } from './scim.groups.routes.js';
import { registerBulkRoutes } from './scim.bulk.routes.js';

import type { FastifyInstance } from 'fastify';

export const registerScimRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await registerServiceProviderConfigRoutes(fastify);
  await registerSchemasRoutes(fastify);
  await registerResourceTypesRoutes(fastify);
  await registerUsersRoutes(fastify);
  await registerGroupsRoutes(fastify);
  await registerBulkRoutes(fastify);
};
