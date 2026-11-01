/**
 * Helpers for plain calendar dates stored as 'YYYY-MM-DD' strings.
 * We do the maths in UTC so the user's own timezone can never shift a date
 * by one day.
 */

function toUTCDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(year: number, monthIndex: number, day: number) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return date.toISOString().slice(0, 10);
}

/** addDays("2026-11-30", 1) → "2026-12-01" */
export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(y, m - 1, d + days);
}

/** Move by `delta` months. `monthIndex` is 0-based (0 = January). */
export function addMonths(year: number, monthIndex: number, delta: number) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

/**
 * The weeks of a month for a calendar view, Sunday first.
 * Days outside the month are `null`.
 */
export function monthGrid(year: number, monthIndex: number): (string | null)[][] {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toISODate(year, monthIndex, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Format a 'YYYY-MM-DD' date, e.g. formatISODate("2026-11-03") → "Tue 3 Nov". */
export function formatISODate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" },
) {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(toUTCDate(iso));
}

export function formatMonth(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}
