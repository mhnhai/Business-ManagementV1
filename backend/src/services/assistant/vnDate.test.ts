import { describe, expect, it } from 'vitest';

import {
  formatVnDate,
  getTodayVnDateDisplay,
  getTodayVnDateIso,
  parseDayEnd,
  parseDayStart,
} from './vnDate';

describe('vnDate', () => {
  it('formats today in Vietnam timezone', () => {
    // 2026-07-20 20:00 UTC = 2026-07-21 03:00 VN
    const d = new Date('2026-07-20T20:00:00.000Z');
    expect(getTodayVnDateIso(d)).toBe('2026-07-21');
    expect(getTodayVnDateDisplay(d)).toBe('21/07/2026');
  });

  it('parses VN day boundaries', () => {
    const start = parseDayStart('2026-07-21');
    const end = parseDayEnd('2026-07-21');
    expect(start.toISOString()).toBe('2026-07-20T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-21T16:59:59.999Z');
    expect(formatVnDate(start)).toBe('2026-07-21');
  });
});
