import type { FastifyInstance } from "fastify";
import { getHealth, getReadiness } from "./health.service.js";

export const registerHealthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get("/health", async () => getHealth());

  fastify.get("/ready", async (_request, reply) => {
    const readiness = await getReadiness();
    if (readiness.status !== "ok") {
      reply.code(503);
    }

    return readiness;
  });
};
