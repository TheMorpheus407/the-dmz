import { checkDatabaseHealth } from "../../shared/database/connection.js";
import { checkRedisHealth } from "../../shared/database/redis.js";

export type HealthResponse = {
  status: "ok";
};

export type ReadinessResponse = {
  status: "ok" | "degraded";
  checks: {
    database: { ok: boolean; message: string };
    redis: { ok: boolean; message: string };
  };
};

export const getHealth = (): HealthResponse => ({ status: "ok" });

export const getReadiness = async (): Promise<ReadinessResponse> => {
  const [database, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
  const status = database.ok && redis.ok ? "ok" : "degraded";

  return {
    status,
    checks: {
      database,
      redis,
    },
  };
};
