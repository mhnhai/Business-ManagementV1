export interface PaginationQuery {
  page: number;
  pageSize: number;
  enabled: boolean;
}

function parsePositiveInt(value: unknown): number | undefined {
  let raw: unknown = value;
  if (Array.isArray(value)) {
    const first = value[0] as unknown;
    raw = first;
  }
  if (raw === undefined || raw === null || raw === '') return undefined;
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return undefined;
  return num;
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  defaultPageSize = 10,
): PaginationQuery {
  const page = parsePositiveInt(query.page);
  const pageSize = parsePositiveInt(query.pageSize);
  const enabled = page !== undefined || pageSize !== undefined;

  return {
    page: page ?? 1,
    pageSize: pageSize ?? defaultPageSize,
    enabled,
  };
}
