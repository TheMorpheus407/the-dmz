import type { AppConfig } from "../../config.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
  }

  interface FastifyRequest {
    startTime?: bigint;
  }
}

export {};
