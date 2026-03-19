import fp from 'fastify-plugin';

import { playerProfilesRoutes } from './player-profiles.routes.js';
import { socialRelationshipRoutes } from './social-relationship.routes.js';
import { presenceRoutes } from './presence.routes.js';
import { quickSignalsRoutes } from './quick-signals.routes.js';
import { leaderboardRoutes } from './leaderboard.routes.js';
import { endorsementRoutes } from './endorsement.routes.js';
import { reputationRoutes } from './reputation.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

async function registerSocialPlugin(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.register(playerProfilesRoutes, config);
  fastify.register(socialRelationshipRoutes, config);
  fastify.register(presenceRoutes, config);
  fastify.register(quickSignalsRoutes, config);
  fastify.register(leaderboardRoutes, config);
  fastify.register(endorsementRoutes, config);
  fastify.register(reputationRoutes, config);
}

export const socialPlugin = fp(registerSocialPlugin, {
  name: 'social',
  dependencies: ['auth', 'eventBus'],
});
