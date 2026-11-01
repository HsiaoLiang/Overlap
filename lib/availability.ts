import type { Participant } from "./types";

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
