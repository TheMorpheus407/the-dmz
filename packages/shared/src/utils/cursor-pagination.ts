import { cursorPaginationMetaSchema, cursorPaginationSchema } from '../schemas/common.schema.js';

import type { CursorPaginationInput, CursorPaginationMeta } from '../types/common.js';

export interface CursorPayload {
  offset: number;
  sortValues?: unknown[];
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return toBase64Url(json);
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = fromBase64Url(cursor);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (typeof parsed['offset'] === 'number' && parsed['offset'] >= 0) {
      return {
        offset: parsed['offset'],
        sortValues: Array.isArray(parsed['sortValues']) ? parsed['sortValues'] : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function parseCursorPaginationParams(
  params: unknown,
):
  | { input: CursorPaginationInput; error?: never }
  | { input?: never; error: { code: string; message: string } } {
  const result = cursorPaginationSchema.safeParse(params);
  if (!result.success) {
    return {
      error: {
        code: 'PAGINATION_INVALID_PARAMS',
        message: 'Invalid pagination parameters',
      },
    };
  }
  return { input: result.data };
}

export function buildCursorPaginationMeta(
  hasMore: boolean,
  currentOffset: number,
  limit: number,
  total?: number,
  sortValues?: unknown[],
): CursorPaginationMeta {
  const meta: CursorPaginationMeta = {
    hasMore,
    nextCursor: hasMore
      ? encodeCursor({ offset: currentOffset + limit, sortValues: sortValues ?? [] })
      : null,
  };
  if (total !== undefined) {
    meta.total = total;
  }
  return meta;
}

export function validateCursorPaginationMeta(meta: unknown): meta is CursorPaginationMeta {
  return cursorPaginationMetaSchema.safeParse(meta).success;
}

export const DEFAULT_PAGINATION_LIMIT = 20;
export const MAX_PAGINATION_LIMIT = 100;
export const MIN_PAGINATION_LIMIT = 1;

export function clampLimit(limit: number): number {
  return Math.max(MIN_PAGINATION_LIMIT, Math.min(MAX_PAGINATION_LIMIT, limit));
}

export function getLimitFromInput(input: CursorPaginationInput): number {
  const limit = input.limit ?? DEFAULT_PAGINATION_LIMIT;
  return clampLimit(limit);
}
