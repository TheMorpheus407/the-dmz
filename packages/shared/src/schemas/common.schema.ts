import { z } from 'zod';

import { DEFAULT_PAGINATION_LIMIT } from '../constants/pagination.js';

export const displayNameSchema = z.string().min(1).max(50);

export type DisplayNameInput = z.infer<typeof displayNameSchema>;

export const sortOrderSchema = z.enum(['asc', 'desc']);

export type SortOrderInput = z.infer<typeof sortOrderSchema>;

export const cursorPaginationSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(DEFAULT_PAGINATION_LIMIT),
  })
  .strict();

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

export const cursorPaginationMetaSchema = z
  .object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    total: z.number().int().nullable().optional(),
  })
  .strict();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: sortOrderSchema.default('desc'),
  })
  .strict();

export type PaginationInput = z.infer<typeof paginationSchema>;

export const dateRangeSchema = z
  .object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  })
  .strict();

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
