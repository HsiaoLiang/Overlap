import { addDays } from "./dates";
import type { OverlapEvent } from "./types";

/*
 * How long an event is kept. Keep in sync with supabase/migrations/004_cleanup.sql.
 *   dates:    30 days after the event's last date
 *   weekdays: 90 days after the last activity (created, finalised or a response)
 */
export const DATES_RETENTION_DAYS = 30;
export const WEEKDAYS_RETENTION_DAYS = 90;

/** The calendar day (YYYY-MM-DD) of an instant, in the given IANA timezone. */
function dayInTimeZone(instant: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

/**
 * The last day the event is kept, as 'YYYY-MM-DD' ("deleted after …").
 * `lastParticipantUpdate` is the latest `participants.updated_at`, if anyone has responded.
 */
export function deleteAfterDate(
  event: Pick<OverlapEvent, "date_mode" | "days" | "timezone" | "created_at" | "finalised_at">,
  lastParticipantUpdate?: string | null,
): string {
  if (event.date_mode === "dates") {
    const lastDay = [...event.days].sort().at(-1)!;
    return addDays(lastDay, DATES_RETENTION_DAYS);
  }

  const times = [event.created_at, event.finalised_at, lastParticipantUpdate]
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());
  const lastActivity = new Date(Math.max(...times));
  return addDays(dayInTimeZone(lastActivity, event.timezone), WEEKDAYS_RETENTION_DAYS);
}
