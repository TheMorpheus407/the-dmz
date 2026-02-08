export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    requestId?: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};
