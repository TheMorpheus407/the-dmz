import { z } from "zod";

export const sortOrderSchema = z.enum(["asc", "desc"]);

export type SortOrderInput = z.infer<typeof sortOrderSchema>;

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: sortOrderSchema.default("desc"),
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
