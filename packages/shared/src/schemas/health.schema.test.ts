import { describe, expect, it } from "vitest";

import {
  healthQueryJsonSchema,
  healthQuerySchema,
  healthResponseJsonSchema,
  healthResponseSchema,
  readinessResponseJsonSchema,
  readinessResponseSchema,
} from "./index.js";

type JsonSchemaShape = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

describe("health schemas", () => {
  it("accepts an empty health query", () => {
    const result = healthQuerySchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts a health query with probe", () => {
    const result = healthQuerySchema.parse({ probe: "liveness" });
    expect(result.probe).toBe("liveness");
  });

  it("accepts a valid health response", () => {
    const result = healthResponseSchema.parse({
      status: "ok",
    });

    expect(result.status).toBe("ok");
  });

  it("accepts a valid readiness response", () => {
    const result = readinessResponseSchema.parse({
      status: "degraded",
      checks: {
        database: { ok: false, message: "Database connection not configured" },
        redis: { ok: false, message: "Redis connection not configured" },
      },
    });

    expect(result.status).toBe("degraded");
  });
});

describe("health json schemas", () => {
  it("creates a health query json schema", () => {
    const schema = healthQueryJsonSchema as JsonSchemaShape;
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeTruthy();
    expect(schema.additionalProperties).toBe(false);
  });

  it("creates a health json schema", () => {
    const schema = healthResponseJsonSchema as JsonSchemaShape;
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeTruthy();
    expect(schema.required).toEqual(expect.arrayContaining(["status"]));
    expect(schema.additionalProperties).toBe(false);
  });

  it("creates a readiness json schema", () => {
    const schema = readinessResponseJsonSchema as JsonSchemaShape;
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeTruthy();
    expect(schema.required).toEqual(
      expect.arrayContaining(["status", "checks"]),
    );
    expect(schema.additionalProperties).toBe(false);
  });
});
