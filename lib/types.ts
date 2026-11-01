export type DateMode = "dates" | "weekdays";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** An event as stored in the `events` table. */
export type OverlapEvent = {
  id: string;
  slug: string;
  name: string;
  date_mode: DateMode;
  /** 'YYYY-MM-DD' dates, or weekday codes like 'mon'. Always sorted. */
  days: string[];
  /** Minutes after midnight in the event's timezone. 540 = 09:00. */
  start_minute: number;
  /** Exclusive. 1260 = the last slot is 20:30–21:00. */
  end_minute: number;
  timezone: string;
  created_at: string;
};

/** A participant as the browser sees it (no PIN data). */
export type Participant = {
  id: string;
  name: string;
  /** Slot keys this person is free, e.g. "2026-11-03 09:30". See lib/slots.ts. */
  slots: string[];
  hasPin: boolean;
};

/** The event columns that are safe to send to the browser. */
export const EVENT_COLUMNS =
  "id, slug, name, date_mode, days, start_minute, end_minute, timezone, created_at";
