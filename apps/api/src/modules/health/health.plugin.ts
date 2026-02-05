import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { registerHealthRoutes } from "./health.routes.js";

const healthPluginImpl: FastifyPluginAsync = async (fastify) => {
  await registerHealthRoutes(fastify);
};

export const healthPlugin = fp(healthPluginImpl, { name: "health" });
