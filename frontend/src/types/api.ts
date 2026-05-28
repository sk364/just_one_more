export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: import("./models").User;
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
