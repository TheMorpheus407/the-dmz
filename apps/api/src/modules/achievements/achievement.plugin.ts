import fp from 'fastify-plugin';

import { getDatabaseClient } from '../../shared/database/connection.js';

import { AchievementService } from './achievement.service.js';
import { createAchievementEventHandlers } from './achievement.events.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

async function registerAchievementPlugin(
  fastify: FastifyInstance,
  _config: AppConfig,
): Promise<void> {
  const db = getDatabaseClient(_config);
  const achievementService = new AchievementService(db, fastify.eventBus);

  const eventHandlers = createAchievementEventHandlers(achievementService);

  for (const { eventType, handler } of eventHandlers) {
    fastify.eventBus.subscribe(eventType, handler);
  }

  const routesModule = await import('./achievement.routes.js');
  void routesModule.registerAchievementRoutes(fastify, _config, achievementService);
}

export const achievementPlugin = fp(registerAchievementPlugin, {
  name: 'achievements',
  dependencies: ['auth', 'eventBus'],
});
