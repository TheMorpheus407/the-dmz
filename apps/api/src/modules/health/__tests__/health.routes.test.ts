import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../../app.js";
import { loadConfig } from "../../../config.js";

const createTestConfig = () => {
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
          message: "Database connection not configured",
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
