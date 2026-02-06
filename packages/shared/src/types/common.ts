export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SortOrder = 'asc' | 'desc';

export type DateRange = {
  start: string;
  end: string;
};
