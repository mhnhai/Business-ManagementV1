import type { Request } from 'express';

export type StatsPeriodQuery = {
  month?: string;
  year?: string;
  date?: string;
};

export function parseStatsPeriodQuery(query: Request['query']): StatsPeriodQuery {
  const date = typeof query.date === 'string' && query.date.trim() ? query.date.trim() : undefined;
  const month = typeof query.month === 'string' && query.month.trim() ? query.month.trim() : undefined;
  const year = typeof query.year === 'string' && query.year.trim() ? query.year.trim() : undefined;
  return { date, month, year };
}

/** Khoảng thời gian lọc activity — ưu tiên `date` (YYYY-MM-DD), dùng UTC khớp dữ liệu seed. */
export function buildActivityDateFilter(period: StatsPeriodQuery) {
  const { month, year, date } = period;

  if (date && date !== 'all') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (match) {
      const y = Number(match[1]);
      const m = Number(match[2]);
      const d = Number(match[3]);
      return {
        gte: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)),
        lt: new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0)),
      };
    }
  }

  if (!year || year === 'all') return undefined;

  const y = Number.parseInt(year, 10);
  if (Number.isNaN(y)) return undefined;

  if (month && month !== 'all') {
    const m = Number.parseInt(month, 10);
    if (Number.isNaN(m)) return undefined;
    return {
      gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    };
  }

  return {
    gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
    lt: new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0)),
  };
}
