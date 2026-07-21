export const VN_TZ = 'Asia/Ho_Chi_Minh';

/** Today as YYYY-MM-DD in Vietnam timezone. */
export function getTodayVnDateIso(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Today as DD/MM/YYYY for display in prompts. */
export function getTodayVnDateDisplay(now = new Date()): string {
  const iso = getTodayVnDateIso(now);
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Format for the model in Vietnam local time (avoids UTC date shift). */
export function formatVnDateTime(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatVnDate(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Start of calendar day in Vietnam → UTC instant. */
export function parseDayStart(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return d;
}

/** End of calendar day in Vietnam → UTC instant. */
export function parseDayEnd(dateStr: string): Date {
  const d = new Date(`${dateStr}T23:59:59.999+07:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return d;
}
