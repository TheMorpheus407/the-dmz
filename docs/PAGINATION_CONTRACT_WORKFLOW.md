# Pagination Contract Workflow

This document describes the cursor-based pagination contract and how contributors should work with it.

## Overview

The DMZ uses cursor-based pagination for all list endpoints across backend, shared schemas, OpenAPI, and web consumers. This ensures:

- Consistent query parameter naming (`cursor`, `limit`)
- Standardized response metadata shape (`hasMore`, `nextCursor`, `total`)
- Deterministic cursor encoding/decoding for stable pagination state
- Limit guardrails with bounded defaults

## Contract Location

The pagination contracts are defined in:

```
packages/shared/src/schemas/common.schema.ts    # Zod schemas
packages/shared/src/types/common.ts             # TypeScript types
packages/shared/src/utils/cursor-pagination.ts # Utilities
```

## Canonical Pagination Schema

### Query Parameters

```typescript
// Input schema
const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

- **cursor**: Opaque base64url-encoded string containing offset and sort values
- **limit**: Number of items per page (1-100, default: 20)

### Response Metadata

```typescript
// Output metadata schema
const cursorPaginationMetaSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  total: z.number().int().nullable().optional(),
});
```

- **hasMore**: Boolean indicating if more items exist
- **nextCursor**: Base64url cursor for next page (null if no more pages)
- **total**: Optional total count (when available)

## Using the Pagination Utilities

### Parsing Query Parameters

```typescript
import { parseCursorPaginationParams } from '@the-dmz/shared';

// In your route handler
const result = parseCursorPaginationParams(request.query);
if (result.error) {
  return reply.status(400).send({
    success: false,
    error: { code: 'PAGINATION_INVALID_PARAMS', message: result.error.message },
  });
}
const { cursor, limit } = result.input;
```

### Decoding Cursors

```typescript
import { decodeCursor, getLimitFromInput } from '@the-dmz/shared';

const offset = 0;
const sortValues: unknown[] = [];

if (cursor) {
  const decoded = decodeCursor(cursor);
  if (decoded) {
    offset = decoded.offset;
    sortValues = decoded.sortValues ?? [];
  }
}

const clampedLimit = getLimitFromInput({ cursor, limit });
```

### Building Response Metadata

```typescript
import { buildCursorPaginationMeta } from '@the-dmz/shared';

const items = await fetchItems(offset, clampedLimit, sortValues);
const hasMore = items.length > clampedLimit;
const returnedItems = hasMore ? items.slice(0, clampedLimit) : items;

const meta = buildCursorPaginationMeta(hasMore, offset, clampedLimit, totalCount, sortValues);

return {
  success: true,
  data: returnedItems,
  meta: { pagination: meta },
};
```

## Adding a New Paged Endpoint

When creating a new list endpoint:

1. **Import the pagination schemas and utilities**:

   ```typescript
   import {
     cursorPaginationSchema,
     buildCursorPaginationMeta,
     parseCursorPaginationParams,
     decodeCursor,
     getLimitFromInput,
   } from '@the-dmz/shared';
   ```

2. **Add query parameter validation** to your route:

   ```typescript
   schema: {
     querystring: cursorPaginationSchema;
   }
   ```

3. **Parse and validate pagination params** in the handler:

   ```typescript
   const result = parseCursorPaginationParams(request.query);
   if (result.error) {
     return reply.status(400).send({
       success: false,
       error: { code: 'PAGINATION_INVALID_PARAMS', message: 'Invalid pagination parameters' },
     });
   }
   ```

4. **Use cursor utilities** to fetch paginated data:

   ```typescript
   const { cursor, limit } = result.input;
   const decoded = decodeCursor(cursor ?? '');
   const offset = decoded?.offset ?? 0;
   const clampedLimit = getLimitFromInput({ limit });
   ```

5. **Return paginated response** with metadata:

   ```typescript
   return {
     success: true,
     data: items,
     meta: {
       pagination: buildCursorPaginationMeta(hasMore, offset, clampedLimit, total),
     },
   };
   ```

## OpenAPI Integration

The pagination contracts are exported as JSON schemas for OpenAPI generation:

```typescript
import {
  cursorPaginationJsonSchema,
  cursorPaginationMetaJsonSchema,
} from '@the-dmz/shared/schemas';
```

These schemas are automatically included in the generated OpenAPI documents for list endpoints.

## Frontend Integration

The frontend API client should use the shared pagination types:

```typescript
import type { CursorPaginationMeta } from '@the-dmz/shared';

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    pagination: CursorPaginationMeta;
  };
}
```

## Failure Triage

### Invalid Cursor Format

If decoding fails, treat as initial request (offset 0):

```typescript
const decoded = cursor ? decodeCursor(cursor) : null;
const offset = decoded?.offset ?? 0;
```

### Limit Out of Range

The `getLimitFromInput` utility automatically clamps limits to valid range (1-100).

### Missing Total Count

The `total` field is optional. Omit it when counting would be expensive.

## Testing

Run pagination contract tests:

```bash
pnpm --filter shared test
```

All new paged endpoints should include integration tests verifying:

- Valid pagination params parse correctly
- Invalid params return 400 error
- Response includes correct `meta.pagination` shape
- Cursor round-trip works (encode -> decode -> same offset)
