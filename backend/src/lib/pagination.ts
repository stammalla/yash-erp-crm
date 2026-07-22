export interface Pagination { page: number; limit: number; skip: number; }

export function parsePagination(q: { page?: unknown; limit?: unknown }): Pagination {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(data: T[], total: number, p: Pagination) {
  return { data, meta: { page: p.page, limit: p.limit, total, totalPages: Math.ceil(total / p.limit) } };
}
