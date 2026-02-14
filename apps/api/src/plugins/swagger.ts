import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

import type { FastifyPluginAsync } from 'fastify';

const swaggerPluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'The DMZ API',
        description: 'Backend API for The DMZ: Archive Gate cybersecurity training platform',
        version: fastify.config.API_VERSION,
        contact: {
          name: 'Matrices GmbH',
        },
        license: {
          name: 'Proprietary - Matrices GmbH',
        },
      },
      servers: [
        {
          url: `http://localhost:${fastify.config.PORT}`,
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  if (fastify.config.ENABLE_SWAGGER) {
    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
    return;
  }

  // Keep raw specs available for tooling when Swagger UI is disabled.
  fastify.get('/docs/json', async (_request, reply) => {
    reply.type('application/json; charset=utf-8');
    return fastify.swagger();
  });

  fastify.get('/docs/yaml', async (_request, reply) => {
    reply.type('application/yaml; charset=utf-8');
    return fastify.swagger({ yaml: true });
  });
};

export const swaggerPlugin = fp(swaggerPluginImpl, {
  name: 'swagger',
});
