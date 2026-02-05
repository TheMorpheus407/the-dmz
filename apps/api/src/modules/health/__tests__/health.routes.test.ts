import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../../app.js";
import { loadConfig, type AppConfig } from "../../../config.js";

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
  };
};

describe("health routes", () => {
  const app = buildApp(createTestConfig());

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns ok for /health", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("rejects unexpected query params for /health", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health?probe=invalid",
    });

    expect(response.statusCode).toBe(400);
    const payload = response.json() as {
      success: boolean;
      error: { code: string; message: string; details: { issues: unknown[] } };
    };

    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_FAILED");
    expect(payload.error.message).toBe("Validation failed");
    expect(Array.isArray(payload.error.details.issues)).toBe(true);
    expect(payload.error.details.issues.length).toBeGreaterThan(0);
  });

  it("returns 503 for /ready when dependencies are missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/ready",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: "degraded",
      checks: {
        database: {
          ok: false,
          message: "Database health check disabled for tests",
        },
        redis: {
          ok: false,
          message: "Redis connection not configured",
        },
      },
    });
  });

  it("returns version info at /api/v1/", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      version: "v1",
    });
  });

  it("formats not found errors", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/missing-route",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        details: {},
      },
    });
  });
});
