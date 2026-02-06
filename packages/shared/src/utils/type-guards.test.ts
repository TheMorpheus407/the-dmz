import { describe, expect, it } from "vitest";

import {
  isApiError,
  isApiResponse,
  isPaginationMeta,
  isUserBase,
} from "./type-guards.js";

describe("isApiError", () => {
  it("accepts a valid error shape", () => {
    const value = {
      code: "VALIDATION_FAILED",
      message: "Validation failed",
      details: { field: "email" },
    };

    expect(isApiError(value)).toBe(true);
  });

  it("rejects invalid shapes", () => {
    expect(isApiError({ code: "", message: "" })).toBe(false);
    expect(isApiError({ code: "VALID", message: 12 })).toBe(false);
    expect(isApiError({ code: "VALID", message: "ok", details: [] })).toBe(
      false,
    );
  });
});

describe("isPaginationMeta", () => {
  it("accepts a valid pagination meta", () => {
    const value = { page: 1, limit: 20, total: 120, totalPages: 6 };

    expect(isPaginationMeta(value)).toBe(true);
  });

  it("rejects invalid pagination meta", () => {
    expect(
      isPaginationMeta({ page: "1", limit: 20, total: 120, totalPages: 6 }),
    ).toBe(false);
  });
});

describe("isApiResponse", () => {
  it("accepts success responses", () => {
    const value = {
      success: true,
      data: { id: "user-1" },
      meta: { page: 1, limit: 10, total: 10, totalPages: 1 },
    };

    expect(isApiResponse(value)).toBe(true);
  });

  it("accepts error responses", () => {
    const value = {
      success: false,
      error: { code: "SYSTEM_INTERNAL_ERROR", message: "Failure" },
    };

    expect(isApiResponse(value)).toBe(true);
  });

  it("accepts minimal responses", () => {
    expect(isApiResponse({ success: true })).toBe(true);
    expect(isApiResponse({ success: false })).toBe(true);
  });

  it("rejects responses with invalid error or meta", () => {
    expect(
      isApiResponse({ success: false, error: { code: 123, message: "no" } }),
    ).toBe(false);
    expect(
      isApiResponse({
        success: true,
        meta: { page: "1", limit: 10, total: 10, totalPages: 1 },
      }),
    ).toBe(false);
  });
});

describe("isUserBase", () => {
  it("accepts valid users", () => {
    const value = {
      id: "user-1",
      email: "user@example.invalid",
      displayName: "Test User",
      tenantId: "tenant-1",
    };

    expect(isUserBase(value)).toBe(true);
  });

  it("rejects invalid users", () => {
    expect(
      isUserBase({ id: "", email: "", displayName: "", tenantId: "" }),
    ).toBe(false);
  });
});
