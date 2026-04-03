import fp from 'fastify-plugin';

import { sanitizeForLogging, sanitizeHeaderValue } from '../utils/sanitizer.js';

import type { FastifyInstance } from 'fastify';

interface HttpLogFields {
  requestId: string;
  method: string;
  url: string;
  outcomeCode: number;
  durationMs?: number;
  ip: string | undefined;
  userAgent: string | undefined;
  tenantId?: string;
  userId?: string;
}

const stripQueryParams = (url: string): string => {
  return url.split('?')[0] ?? '/';
};

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

const REQUEST_ID_HEADER = 'x-request-id';

export const requestLogger = fp(async (fastify: FastifyInstance) => {
  const serviceName = 'the-dmz-api';
  const serviceVersion = fastify.config.API_VERSION;
  const serviceEnv = fastify.config.NODE_ENV;

  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = process.hrtime.bigint();

    const clientRequestId = request.headers[REQUEST_ID_HEADER] as string | undefined;
    if (clientRequestId) {
      request.id = sanitizeHeaderValue(clientRequestId);
    }

    reply.header(REQUEST_ID_HEADER, request.id);

    const onRequestFields: HttpLogFields = {
      requestId: request.id,
      method: request.method,
      url: sanitizeForLogging(stripQueryParams(request.url)),
      outcomeCode: 0,
      ip: sanitizeForLogging(getIp(request) || ''),
      userAgent: sanitizeForLogging(getUserAgent(request) || ''),
    };

    if (request.tenantContext) {
      onRequestFields.tenantId = request.tenantContext.tenantId;
      onRequestFields.userId = request.tenantContext.userId;
    }

    request.log.info(
      {
        ...onRequestFields,
        service: { name: serviceName, version: serviceVersion, environment: serviceEnv },
        event: 'operation_started',
      },
      'request received',
    );
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const end = process.hrtime.bigint();
    const durationMs = request.startTime ? Number(end - request.startTime) / 1_000_000 : undefined;

    const onResponseFields: HttpLogFields = {
      requestId: request.id,
      method: request.method,
      url: sanitizeForLogging(stripQueryParams(request.url)),
      outcomeCode: reply.statusCode,
      ip: sanitizeForLogging(getIp(request) || ''),
      userAgent: sanitizeForLogging(getUserAgent(request) || ''),
      ...(durationMs !== undefined && { durationMs }),
    };

    if (request.tenantContext) {
      onResponseFields.tenantId = request.tenantContext.tenantId;
      onResponseFields.userId = request.tenantContext.userId;
    }

    const outcomeCode = reply.statusCode;
    const level = outcomeCode >= 500 ? 'error' : outcomeCode >= 400 ? 'warn' : 'info';
    const message = outcomeCode >= 400 ? 'request completed with error' : 'request completed';

    request.log[level](
      {
        ...onResponseFields,
        service: { name: serviceName, version: serviceVersion, environment: serviceEnv },
        event: 'operation_completed',
      },
      message,
    );
  });
});
