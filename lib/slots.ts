import { TZDate } from "@date-fns/tz";
import { addDays, formatISODate } from "./dates";
import { minutesToLabel, SLOT_MINUTES, WEEKDAYS, WEEKDAY_CODES } from "./time";
import type { OverlapEvent, Weekday } from "./types";

/*
 * Slots and timezones — the heart of the app.
 *
 * A slot is a 30-minute block, identified by a "slot key": the day plus the
 * start time, in the EVENT's timezone. For example:
 *   dates mode:    "2026-11-03 09:30"
 *   weekdays mode: "mon 09:30"
 *
 * Keys are what we store in the database. Only when drawing the grid do we
 * convert each key to a real moment in time and then to the VIEWER's
 * timezone. That keeps storage simple and the conversion in one place.
 */

type EventShape = Pick<
  OverlapEvent,
  "date_mode" | "days" | "start_minute" | "end_minute" | "timezone"
>;

/** Every slot key of an event, in order (day by day, then by time). */
export function slotKeys(event: Pick<OverlapEvent, "days" | "start_minute" | "end_minute">) {
  const keys: string[] = [];
  for (const day of event.days) {
    for (let m = event.start_minute; m < event.end_minute; m += SLOT_MINUTES) {
      keys.push(`${day} ${minutesToLabel(m)}`);
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Timezone helpers

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The date, time and weekday of a moment, as seen in timezone `tz`. */
export function zonedParts(instant: number, tz: string) {
  let formatter = formatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    formatters.set(tz, formatter);
  }
  const p = Object.fromEntries(formatter.formatToParts(instant).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`, // "2026-11-03"
    time: `${p.hour}:${p.minute}`, // "09:30"
    weekday: p.weekday.toLowerCase() as Weekday, // "tue"
  };
}

/**
 * Weekday events have no real dates, so to convert them between timezones we
 * pin them to the current week (Monday–Sunday in the event's timezone).
 */
function referenceMonday(tz: string, now: number) {
  const today = zonedParts(now, tz);
  return addDays(today.date, -WEEKDAY_CODES.indexOf(today.weekday));
}

/** The real moment (ms since 1970, UTC) a slot key starts. */
function slotInstant(key: string, event: EventShape, monday: string) {
  const [day, time] = key.split(" ");
  const date =
    event.date_mode === "dates" ? day : addDays(monday, WEEKDAY_CODES.indexOf(day as Weekday));
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // TZDate reads these numbers as a wall-clock time in the event's timezone.
  return new TZDate(y, mo - 1, d, h, mi, event.timezone).getTime();
}

// ---------------------------------------------------------------------------
// The grid a viewer sees

export type GridColumn = { id: string; label: string; sublabel?: string };
export type GridRow = { time: string; showLabel: boolean; gapBefore: boolean };

export type ViewerGrid = {
  columns: GridColumn[];
  rows: GridRow[];
  /** cells[row][col] is a slot key, or null if that cell isn't part of the event. */
  cells: (string | null)[][];
};

/**
 * Lay out an event's slots in the viewer's timezone.
 *
 * Columns are the viewer's local days, rows the viewer's local times. If the
 * timezone difference pushes some slots past midnight, an event day can span
 * two columns; cells that aren't part of the event are null. When the rows
 * aren't continuous (e.g. 00:00–04:30 and then 17:00–23:30) we flag a gap.
 */
export function buildViewerGrid(event: EventShape, viewerTz: string, now = Date.now()): ViewerGrid {
  const monday = event.date_mode === "weekdays" ? referenceMonday(event.timezone, now) : "";

  const placed = slotKeys(event).map((key) => {
    const instant = slotInstant(key, event, monday);
    const local = zonedParts(instant, viewerTz);
    const column = event.date_mode === "dates" ? local.date : local.weekday;
    return { key, instant, column, time: local.time };
  });

  // Columns in chronological order of their first slot.
  const firstInstant = new Map<string, number>();
  for (const p of placed) {
    const seen = firstInstant.get(p.column);
    if (seen === undefined || p.instant < seen) firstInstant.set(p.column, p.instant);
  }
  const columnIds = [...firstInstant.keys()].sort(
    (a, b) => firstInstant.get(a)! - firstInstant.get(b)!,
  );
  const times = [...new Set(placed.map((p) => p.time))].sort();

  const colIndex = new Map(columnIds.map((id, i) => [id, i]));
  const rowIndex = new Map(times.map((t, i) => [t, i]));
  const cells: (string | null)[][] = times.map(() => columnIds.map(() => null));
  for (const p of placed) cells[rowIndex.get(p.time)!][colIndex.get(p.column)!] = p.key;

  const rows = times.map((time, i) => ({
    time,
    showLabel: i === 0 || time.endsWith(":00") || toMinutes(time) - toMinutes(times[i - 1]) > SLOT_MINUTES,
    gapBefore: i > 0 && toMinutes(time) - toMinutes(times[i - 1]) > SLOT_MINUTES,
  }));

  const columns = columnIds.map((id): GridColumn =>
    event.date_mode === "dates"
      ? {
          id,
          label: formatISODate(id, { weekday: "short" }),
          sublabel: formatISODate(id, { day: "numeric", month: "short" }),
        }
      : { id, label: WEEKDAYS.find((w) => w.code === id)!.short },
  );

  return { columns, rows, cells };
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
