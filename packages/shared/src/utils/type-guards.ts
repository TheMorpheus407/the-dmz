import type { ApiError, ApiResponse } from "../types/api.js";
import type { PaginationMeta } from "../types/common.js";
import type { UserBase } from "../types/auth.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isApiError = (value: unknown): value is ApiError => {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    !isNonEmptyString(record["code"]) ||
    !isNonEmptyString(record["message"])
  ) {
    return false;
  }

  if (record["details"] !== undefined && !isRecord(record["details"])) {
    return false;
  }

  return true;
};

export const isPaginationMeta = (value: unknown): value is PaginationMeta => {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    isNumber(record["page"]) &&
    isNumber(record["limit"]) &&
    isNumber(record["total"]) &&
    isNumber(record["totalPages"])
  );
};

export const isApiResponse = <T = unknown>(
  value: unknown,
): value is ApiResponse<T> => {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record["success"] !== "boolean") {
    return false;
  }

  if (record["error"] !== undefined && !isApiError(record["error"])) {
    return false;
  }

  if (record["meta"] !== undefined && !isPaginationMeta(record["meta"])) {
    return false;
  }

  return true;
};

export const isUserBase = (value: unknown): value is UserBase => {
  if (!isRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    isNonEmptyString(record["id"]) &&
    isNonEmptyString(record["email"]) &&
    isNonEmptyString(record["displayName"]) &&
    isNonEmptyString(record["tenantId"])
  );
};
