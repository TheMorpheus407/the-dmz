import fp from 'fastify-plugin';

import { settingsRoutes } from './settings.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

async function registerSettingsPlugin(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.register(settingsRoutes, config);
}

export const settingsPlugin = fp(registerSettingsPlugin, {
  name: 'settings',
  dependencies: ['auth'],
});
