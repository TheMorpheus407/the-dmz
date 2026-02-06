import { describe, expect, it } from "vitest";
import {
  dateRangeJsonSchema,
  dateRangeSchema,
  paginationJsonSchema,
  paginationSchema,
} from "./index.js";

type JsonSchemaShape = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

describe("common schemas", () => {
  it("coerces and defaults pagination values", () => {
    const result = paginationSchema.parse({
      page: "2",
      limit: "5",
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.sortOrder).toBe("desc");
  });

  it("rejects invalid pagination values", () => {
    expect(() =>
      paginationSchema.parse({
        page: 0,
        limit: 500,
      }),
    ).toThrow();
  });

  it("accepts valid date ranges", () => {
    const result = dateRangeSchema.parse({
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result.start).toBe("2024-01-01T00:00:00.000Z");
  });

  it("rejects invalid date ranges", () => {
    expect(() =>
      dateRangeSchema.parse({
        start: "not-a-date",
        end: "2024-01-02T00:00:00.000Z",
      }),
    ).toThrow();
  });
});

describe("common json schemas", () => {
  it("creates a pagination json schema", () => {
    const schema = paginationJsonSchema as JsonSchemaShape;
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeTruthy();
    const keys = Object.keys(schema.properties ?? {});
    expect(keys).toEqual(
      expect.arrayContaining(["page", "limit", "sortOrder"]),
    );
    expect(schema.additionalProperties).toBe(false);
  });

  it("creates a date range json schema", () => {
    const schema = dateRangeJsonSchema as JsonSchemaShape;
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeTruthy();
    expect(schema.required).toEqual(expect.arrayContaining(["start", "end"]));
    expect(schema.additionalProperties).toBe(false);
  });
});
