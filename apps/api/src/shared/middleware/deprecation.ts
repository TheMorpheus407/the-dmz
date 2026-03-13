import fp from 'fastify-plugin';

import { getDeprecationPolicy, API_VERSIONING_POLICY } from '../policies/index.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    deprecated?: boolean;
    deprecationDate?: Date;
    successorVersion?: string;
  }
}

export interface DeprecationOptions {
  sunsetDate: Date | string;
  successorPath?: string;
  customMessage?: string;
}

interface RouteConfig {
  deprecation?: DeprecationOptions;
}

async function deprecationPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    const routeOptions = request.routeOptions as { config?: RouteConfig } | undefined;
    const deprecationConfig = routeOptions?.config?.deprecation;

    if (deprecationConfig) {
      const policy = getDeprecationPolicy();

      const deprecationDate =
        typeof deprecationConfig.sunsetDate === 'string'
          ? new Date(deprecationConfig.sunsetDate)
          : deprecationConfig.sunsetDate;

      if (policy.requiredHeaders.deprecation) {
        reply.header('Deprecation', `="${request.url}"; dt="${deprecationDate.toISOString()}"`);
      }

      if (policy.requiredHeaders.sunset) {
        reply.header('Sunset', deprecationDate.toUTCString());
      }

      if (policy.requiredHeaders.link && deprecationConfig.successorPath) {
        const successorUrl = deprecationConfig.successorPath.startsWith('http')
          ? deprecationConfig.successorPath
          : `${API_VERSIONING_POLICY.openApi.servers[0]?.url || ''}${deprecationConfig.successorPath}`;

        reply.header('Link', `<${successorUrl}>; rel="successor-version"`);
      }

      fastify.log.warn({
        msg: 'Deprecated endpoint accessed',
        endpoint: request.url,
        method: request.method,
        sunsetDate: deprecationDate.toISOString(),
        successorPath: deprecationConfig.successorPath,
        clientIp: request.headers['x-forwarded-for'] || request.ip,
        userAgent: request.headers['user-agent'],
      });
    }
  });
}

export const deprecationMiddleware = fp(deprecationPlugin, {
  name: 'deprecation-middleware',
  fastify: '5.x',
});

export function createDeprecationHandler(options: DeprecationOptions) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const policy = getDeprecationPolicy();
    const sunsetDate =
      typeof options.sunsetDate === 'string' ? new Date(options.sunsetDate) : options.sunsetDate;

    if (policy.requiredHeaders.deprecation) {
      reply.header('Deprecation', `="${request.url}"; dt="${sunsetDate.toISOString()}"`);
    }

    if (policy.requiredHeaders.sunset) {
      reply.header('Sunset', sunsetDate.toUTCString());
    }

    if (policy.requiredHeaders.link && options.successorPath) {
      const successorUrl = options.successorPath.startsWith('http')
        ? options.successorPath
        : `${API_VERSIONING_POLICY.openApi.servers[0]?.url || ''}${options.successorPath}`;

      reply.header('Link', `<${successorUrl}>; rel="successor-version"`);
    }

    const logger = request.server?.log;
    if (logger) {
      logger.warn({
        msg: 'Deprecated endpoint accessed via handler',
        endpoint: request.url,
        method: request.method,
        sunsetDate: sunsetDate.toISOString(),
        successorPath: options.successorPath,
        clientIp: request.headers['x-forwarded-for'] || request.ip,
        userAgent: request.headers['user-agent'],
      });
    }
  };
}

declare module 'fastify' {
  interface FastifySchema {
    deprecation?: DeprecationOptions;
  }
}
