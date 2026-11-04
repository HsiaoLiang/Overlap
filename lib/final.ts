import { describeRange, slotKeys } from "./slots";
import { minutesToLabel, SLOT_MINUTES } from "./time";
import type { FinalState, OverlapEvent, Participant } from "./types";

/*
 * The organiser's final time: a run of consecutive slots on one event day.
 * Stored as two slot keys in the event's timezone, end exclusive:
 *   { start: "2026-11-19 19:00", end: "2026-11-19 20:30" }
 *   { start: "wed 19:00",        end: "wed 20:30" }   (weekday events)
 */

export type FinalRange = { start: string; end: string };

type EventShape = Pick<
  OverlapEvent,
  "date_mode" | "days" | "start_minute" | "end_minute" | "timezone"
>;

/** The final range from an event's stored state, or null while it's open. */
export function finalRangeOf(state: FinalState): FinalRange | null {
  return state.final_start && state.final_end
    ? { start: state.final_start, end: state.final_end }
    : null;
}

/** "2026-11-19 19:30" → { day: "2026-11-19", minute: 1170 }; null if malformed. */
export function parseSlotKey(key: string) {
  const match = /^(\S+) (\d{2}):(\d{2})$/.exec(key);
  if (!match) return null;
  return { day: match[1], minute: Number(match[2]) * 60 + Number(match[3]) };
}

/** Why a range can't be this event's final time, or null if it's fine. */
export function finalRangeError(
  event: Pick<OverlapEvent, "days" | "start_minute" | "end_minute">,
  range: FinalRange,
): string | null {
  const start = parseSlotKey(range.start);
  const end = parseSlotKey(range.end);
  if (!start || !end) return "That time isn't valid.";
  if (!event.days.includes(start.day)) return "That day isn't part of the event.";
  if (end.day !== start.day) return "The final time must start and end on the same day.";
  if (start.minute % SLOT_MINUTES !== 0 || end.minute % SLOT_MINUTES !== 0) {
    return "Times must be on the hour or half hour.";
  }
  if (end.minute <= start.minute) return "The end must be after the start.";
  if (start.minute < event.start_minute || end.minute > event.end_minute) {
    return "That time is outside the event's hours.";
  }
  return null;
}

/** The slot keys a valid range covers, from start up to (not including) end. */
export function finalRangeKeys(range: FinalRange): string[] {
  const start = parseSlotKey(range.start)!;
  const end = parseSlotKey(range.end)!;
  const keys: string[] = [];
  for (let m = start.minute; m < end.minute; m += SLOT_MINUTES) {
    keys.push(`${start.day} ${minutesToLabel(m)}`);
  }
  return keys;
}

/** A range starting at `start` and lasting `minutes`. */
export function rangeFrom(start: string, minutes: number): FinalRange {
  const { day, minute } = parseSlotKey(start)!;
  return { start, end: `${day} ${minutesToLabel(minute + minutes)}` };
}

/** The longest final time that can start at `start` (up to the end of that event day). */
export function maxLengthFrom(event: Pick<OverlapEvent, "end_minute">, start: string) {
  return event.end_minute - parseSlotKey(start)!.minute;
}

/** Every possible start for "Choose another time": the event's slots. */
export const finalStartOptions = (event: EventShape) => slotKeys(event);

/**
 * How the final time reads in the viewer's timezone:
 *   { day: "Thu 19 Nov", time: "19:00–20:30", duration: "1 h 30 min" }
 * Weekday events have no date, so the day is plural: "Wednesdays".
 */
export function describeFinal(
  event: EventShape,
  range: FinalRange,
  viewerTz: string,
  now = Date.now(),
) {
  const { day, time, duration } = describeRange(event, finalRangeKeys(range), viewerTz, now);
  return { day: event.date_mode === "weekdays" ? `${day}s` : day, time, duration };
}

/** Who is free for the whole final time, and who can't make it. */
export function attendance(range: FinalRange, participants: Participant[]) {
  const keys = finalRangeKeys(range);
  const free: Participant[] = [];
  const cantMake: Participant[] = [];
  for (const person of participants) {
    const slots = new Set(person.slots);
    (keys.every((key) => slots.has(key)) ? free : cantMake).push(person);
  }
  return { free, cantMake };
}
