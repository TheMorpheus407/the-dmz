import fp from 'fastify-plugin';

import { registerAiPipelineRoutes } from './ai-pipeline.routes.js';
import { createAiPipelineService } from './ai-pipeline.service.js';

import type { AiPipelineService, CreateAiPipelineServiceOptions } from './ai-pipeline.types.js';
import type { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    aiPipeline: {
      service: AiPipelineService;
    };
  }
}

export interface AiPipelinePluginOptions {
  service?: AiPipelineService;
  serviceOptions?: Partial<Omit<CreateAiPipelineServiceOptions, 'config' | 'eventBus'>>;
}

const aiPipelinePluginImpl: FastifyPluginAsync<AiPipelinePluginOptions> = async (
  fastify,
  options,
) => {
  if (!fastify.eventBus) {
    throw new Error('eventBus plugin is required for ai-pipeline module');
  }

  const service =
    options.service ??
    createAiPipelineService({
      config: fastify.config,
      eventBus: fastify.eventBus,
      contentGateway: fastify.content.service,
      logger: fastify.log,
      ...options.serviceOptions,
    });

  fastify.decorate('aiPipeline', { service });

  await fastify.register(async (instance) => {
    await registerAiPipelineRoutes(instance, service);
  });
};

export const aiPipelinePlugin = fp(aiPipelinePluginImpl, {
  name: 'aiPipeline',
  dependencies: ['eventBus', 'content'],
});
