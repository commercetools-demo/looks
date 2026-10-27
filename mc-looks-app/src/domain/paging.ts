export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export interface Page<T> {
  rows: T[];
  /** 1-based, clamped to the available pages. */
  page: number;
  pageCount: number;
  total: number;
}

export function paginate<T>(
  rows: T[],
  page: number,
  pageSize: number
): Page<T> {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  return {
    rows: rows.slice((current - 1) * size, current * size),
    page: current,
    pageCount,
    total: rows.length,
  };
}
