export const PAGE_SIZE = 10;

export function getPageCount(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = PAGE_SIZE,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
