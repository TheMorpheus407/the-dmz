import { contentReviewRoutes } from './content-review.routes.js';
import { playerActionsRoutes } from './player-actions.routes.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

export async function moderationRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  await fastify.register(contentReviewRoutes, config);
  await fastify.register(playerActionsRoutes, config);
}
