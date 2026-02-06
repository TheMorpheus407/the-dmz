import fp from "fastify-plugin";

import type { FastifyPluginAsync } from "fastify";

export const requestLogger: FastifyPluginAsync = fp(async (fastify) => {
  fastify.addHook("onRequest", async (request) => {
    request.startTime = process.hrtime.bigint();
    request.log.info(
      {
        method: request.method,
        url: request.url,
      },
      "request received",
    );
  });

  fastify.addHook("onResponse", async (request, reply) => {
    const end = process.hrtime.bigint();
    const durationMs = request.startTime
      ? Number(end - request.startTime) / 1_000_000
      : undefined;

    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs,
      },
      "request completed",
    );
  });
});
