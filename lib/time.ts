import type { Weekday } from "./types";

export const SLOT_MINUTES = 30;

/** Monday-first, which is what most people expect for a work week. */
export const WEEKDAYS: { code: Weekday; short: string; long: string }[] = [
  { code: "mon", short: "Mon", long: "Monday" },
  { code: "tue", short: "Tue", long: "Tuesday" },
  { code: "wed", short: "Wed", long: "Wednesday" },
  { code: "thu", short: "Thu", long: "Thursday" },
  { code: "fri", short: "Fri", long: "Friday" },
  { code: "sat", short: "Sat", long: "Saturday" },
  { code: "sun", short: "Sun", long: "Sunday" },
];

export const WEEKDAY_CODES = WEEKDAYS.map((d) => d.code);

/** 540 → "09:00", 1440 → "24:00" */
export function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Every half hour from `from` to `to` inclusive, in minutes. */
export function halfHours(from = 0, to = 1440) {
  const result: number[] = [];
  for (let m = from; m <= to; m += SLOT_MINUTES) result.push(m);
  return result;
}

/** True if 'YYYY-MM-DD' is a real calendar date. */
export function isISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

/** True if `tz` is an IANA timezone this runtime understands. */
export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "Asia/Taipei" → "Taipei", "America/Argentina/Buenos_Aires" → "Buenos Aires" */
export function timeZoneCity(tz: string) {
  return tz.split("/").pop()!.replaceAll("_", " ");
}

/** "GMT+8", "GMT-3:30", "GMT" for the given zone right now. */
export function timeZoneOffsetLabel(tz: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(at);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}
