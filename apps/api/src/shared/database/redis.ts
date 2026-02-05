import type { DependencyHealth } from "./connection.js";

export async function checkRedisHealth(): Promise<DependencyHealth> {
  return {
    ok: false,
    message: "Redis connection not configured",
  };
}
