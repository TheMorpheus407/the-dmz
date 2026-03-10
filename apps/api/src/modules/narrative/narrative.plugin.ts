import { type FastifyInstance } from 'fastify';

import { registerNarrativeRoutes } from './narrative.routes.js';

export const registerNarrativePlugin = async (fastify: FastifyInstance): Promise<void> => {
  await registerNarrativeRoutes(fastify);
};

export { registerNarrativeRoutes } from './narrative.routes.js';

export * from './narrative.service.js';
