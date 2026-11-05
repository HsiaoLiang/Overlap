import { attendance, finalRangeKeys, type FinalRange } from "./final";
import { slotStartInstant } from "./slots";
import { SLOT_MINUTES } from "./time";
import type { OverlapEvent, Participant } from "./types";

/*
 * "Add to calendar" for the final time. No calendar APIs or keys needed:
 * - Google Calendar and Outlook open a pre-filled "new event" page (a URL),
 * - Apple Calendar (and most others) import an .ics file.
 */

export type CalendarEntry = {
  uid: string;
  title: string;
  /** ms since 1970, UTC */
  start: number;
  end: number;
  /** Weekday events ("Wednesdays 19:00") repeat every week. */
  weekly: boolean;
  description: string;
  url: string;
};

type EventShape = Pick<
  OverlapEvent,
  "id" | "name" | "date_mode" | "days" | "start_minute" | "end_minute" | "timezone"
>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Everything a calendar needs to know about an event's final time. */
export function calendarEntry(
  event: EventShape,
  range: FinalRange,
  participants: Participant[],
  eventUrl: string,
  now = Date.now(),
): CalendarEntry {
  const keys = finalRangeKeys(range);
  const length = keys.length * SLOT_MINUTES * 60_000;
  let start = slotStartInstant(event, keys[0], now);
  // Weekday events: if this week's occurrence is already over, start next week.
  if (event.date_mode === "weekdays" && start + length <= now) {
    start = slotStartInstant(event, keys[0], now + WEEK_MS);
  }

  const { free, cantMake } = attendance(range, participants);
  const names = (people: Participant[]) => people.map((p) => p.name).join(", ");
  const description = [
    `Event page: ${eventUrl}`,
    free.length > 0 && `Coming: ${names(free)}`,
    cantMake.length > 0 && `Can't make it: ${names(cantMake)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    uid: `${event.id}@overlapping.day`,
    title: event.name,
    start,
    end: start + length,
    weekly: event.date_mode === "weekdays",
    description,
    url: eventUrl,
  };
}

/** 2026-11-19 11:00 UTC → "20261119T110000Z" */
export function utcStamp(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(entry: CalendarEntry) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${utcStamp(entry.start)}/${utcStamp(entry.end)}`,
    details: entry.description,
  });
  if (entry.weekly) params.set("recur", "RRULE:FREQ=WEEKLY");
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Outlook on the web. (Its link can't repeat weekly; the .ics file can.) */
export function outlookCalendarUrl(entry: CalendarEntry) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: entry.title,
    startdt: new Date(entry.start).toISOString(),
    enddt: new Date(entry.end).toISOString(),
    body: entry.description,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

/** Escape text for an .ics file (RFC 5545). */
function escapeText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * .ics lines may be at most 75 bytes; longer ones continue on the next line
 * after a space. Count bytes, not characters: 團 is 3 bytes in UTF-8.
 */
function fold(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * An .ics file with one event. Times are in UTC, which every calendar app
 * reads correctly. (For weekly events in places with daylight saving, the
 * local time can then shift by an hour across the change — fine for now.)
 */
export function toICS(entry: CalendarEntry, now = Date.now()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Overlap//overlapping.day//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${entry.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(entry.start)}`,
    `DTEND:${utcStamp(entry.end)}`,
    ...(entry.weekly ? ["RRULE:FREQ=WEEKLY"] : []),
    `SUMMARY:${escapeText(entry.title)}`,
    `DESCRIPTION:${escapeText(entry.description)}`,
    `URL:${entry.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
