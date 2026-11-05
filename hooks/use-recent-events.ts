"use client";

import { useMemo } from "react";
import { readStoredString, useStoredString, writeStoredString } from "@/hooks/use-stored-string";

/*
 * "Your events" on the home page: events this browser created, answered or
 * opened. Kept in localStorage only — no account — so it's per device and
 * disappears if the browser's site data is cleared.
 */

const KEY = "overlap:recent";
const MAX_EVENTS = 20;

export type EventRole = "organiser" | "participant" | "visitor";
export type RecentEvent = { slug: string; name: string; role: EventRole; lastVisited: number };

const RANK: Record<EventRole, number> = { visitor: 0, participant: 1, organiser: 2 };

function parse(raw: string | null): RecentEvent[] {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** Put an event at the top of the list. A role never goes down (organiser stays organiser). */
export function rememberEvent(entry: { slug: string; name: string; role: EventRole }) {
  const list = parse(readStoredString(KEY));
  const previous = list.find((e) => e.slug === entry.slug);
  const role = previous && RANK[previous.role] > RANK[entry.role] ? previous.role : entry.role;
  const next = [
    { ...entry, role, lastVisited: Date.now() },
    ...list.filter((e) => e.slug !== entry.slug),
  ].slice(0, MAX_EVENTS);
  writeStoredString(KEY, JSON.stringify(next));
}

export function forgetEvent(slug: string) {
  const list = parse(readStoredString(KEY)).filter((e) => e.slug !== slug);
  writeStoredString(KEY, JSON.stringify(list));
}

/** The remembered events, most recent first (empty during server rendering). */
export function useRecentEvents() {
  const [raw] = useStoredString(KEY);
  return useMemo(() => parse(raw), [raw]);
}
