export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CursorPaginationMeta = {
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
};

export type CursorPaginationInput = {
  cursor?: string | undefined;
  limit: number;
};

export type SortOrder = 'asc' | 'desc';

export type DateRange = {
  start: string;
  end: string;
};
