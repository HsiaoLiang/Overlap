import { minutesToLabel, SLOT_MINUTES } from "./time";
import type { OverlapEvent, Participant } from "./types";

/** For each slot key, the people who are free then. Slots nobody picked are absent. */
export function freeBySlot(participants: Participant[]) {
  const map = new Map<string, Participant[]>();
  for (const person of participants) {
    for (const key of person.slots) {
      const list = map.get(key);
      if (list) list.push(person);
      else map.set(key, [person]);
    }
  }
  return map;
}

/**
 * How strongly to colour a heatmap cell, as a percentage of the accent colour.
 * Nobody free → 0 (plain background). Otherwise 20–100%, so even one person
 * out of many is still visible.
 */
export function heatStrength(freeCount: number, total: number) {
  if (freeCount === 0 || total === 0) return 0;
  return Math.round(20 + 80 * (freeCount / total));
}

// ---------------------------------------------------------------------------
// Best times

export type TimeRange = {
  /** The first slot key — unique, so it doubles as an id. */
  id: string;
  /** The slot keys in this range, in order. */
  keys: string[];
  /** Who is free for the whole range. */
  free: Participant[];
};

/**
 * The top time ranges where the most people are free.
 *
 * 1. Walk each day's slots in order and merge neighbouring slots where exactly
 *    the same people are free into one range (so "14:00, 14:30, 15:00" becomes
 *    "14:00–15:30").
 * 2. Rank: most people free, then longest, then earliest.
 * 3. Skip a range that sits right next to one already picked — otherwise the
 *    top 3 would often be the same window with one person more or less.
 */
export function bestTimes(
  event: Pick<OverlapEvent, "days" | "start_minute" | "end_minute">,
  participants: Participant[],
  limit = 3,
): TimeRange[] {
  const free = freeBySlot(participants);
  const candidates: (TimeRange & { day: string; from: number; to: number })[] = [];

  for (const day of event.days) {
    let run: (typeof candidates)[number] | null = null;
    let runSignature = "";

    for (let m = event.start_minute; m < event.end_minute; m += SLOT_MINUTES) {
      const key = `${day} ${minutesToLabel(m)}`;
      const people = free.get(key) ?? [];
      const signature = people.map((p) => p.id).sort().join(",");

      if (run && signature === runSignature) {
        run.keys.push(key);
        run.to = m + SLOT_MINUTES;
      } else {
        if (run && run.free.length > 0) candidates.push(run);
        run = { id: key, keys: [key], free: people, day, from: m, to: m + SLOT_MINUTES };
        runSignature = signature;
      }
    }
    if (run && run.free.length > 0) candidates.push(run);
  }

  // Array.sort is stable, and candidates are already in time order, so ties
  // stay earliest-first.
  candidates.sort((a, b) => b.free.length - a.free.length || b.keys.length - a.keys.length);

  const picked: typeof candidates = [];
  for (const candidate of candidates) {
    if (picked.length === limit) break;
    const touchesPicked = picked.some(
      (p) => p.day === candidate.day && (p.to === candidate.from || candidate.to === p.from),
    );
    if (!touchesPicked) picked.push(candidate);
  }

  return picked.map(({ id, keys, free }) => ({ id, keys, free }));
}
