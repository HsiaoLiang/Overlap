"use client";

import { useSyncExternalStore } from "react";

/*
 * The timezone the home page's big globe faces. The create form sets it (it
 * knows which timezone the new event is in), and the globe reads it, without
 * the two having to share a parent component.
 */

let stageTimeZone: string | null = null;
const listeners = new Set<() => void>();

export function setStageTimeZone(timeZone: string | null) {
  if (stageTimeZone === timeZone) return;
  stageTimeZone = timeZone;
  listeners.forEach((notify) => notify());
}

/** The form's timezone, or null before the form has one. */
export function useStageTimeZone() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => stageTimeZone,
    () => null,
  );
}
