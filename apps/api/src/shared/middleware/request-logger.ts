import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

interface RequestLogFields {
  requestId: string;
  method: string;
  url: string;
  statusCode?: number;
  durationMs?: number;
  ip: string | undefined;
  userAgent: string | undefined;
  tenantId?: string;
  userId?: string;
}

const getIp = (request: {
  ip: string | undefined;
  headers: Record<string, string | string[] | undefined>;
}): string | undefined => {
  return request.ip || (request.headers['x-forwarded-for'] as string | undefined);
};

const getUserAgent = (request: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined => {
  return request.headers['user-agent'] as string | undefined;
};

export const requestLogger = fp(async (fastify: FastifyInstance) => {
  const serviceName = 'the-dmz-api';
  const serviceVersion = fastify.config.API_VERSION;
  const serviceEnv = fastify.config.NODE_ENV;

  fastify.addHook('onRequest', async (request) => {
    request.startTime = process.hrtime.bigint();

    const fields: RequestLogFields = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: getIp(request),
      userAgent: getUserAgent(request),
    };

    if (request.tenantContext) {
      fields.tenantId = request.tenantContext.tenantId;
      fields.userId = request.tenantContext.userId;
    }

    request.log.info(
      {
        ...fields,
        service: { name: serviceName, version: serviceVersion, environment: serviceEnv },
        event: 'request_received',
      },
      'request received',
    );
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const end = process.hrtime.bigint();
    const durationMs = request.startTime ? Number(end - request.startTime) / 1_000_000 : undefined;

    const fields: RequestLogFields = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      ip: getIp(request),
      userAgent: getUserAgent(request),
      ...(durationMs !== undefined && { durationMs }),
    };

    if (request.tenantContext) {
      fields.tenantId = request.tenantContext.tenantId;
      fields.userId = request.tenantContext.userId;
    }

    const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info';
    const message = reply.statusCode >= 400 ? 'request completed with error' : 'request completed';

    request.log[level](
      {
        ...fields,
        service: { name: serviceName, version: serviceVersion, environment: serviceEnv },
        event: 'request_completed',
      },
      message,
    );
  });
});
