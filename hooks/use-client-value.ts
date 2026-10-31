"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Read a value that only exists in the browser (the user's timezone, today's
 * date…). Returns `null` during server rendering and the first hydration pass,
 * then the real value — without hydration mismatch warnings.
 *
 * `read` must return the same value (===) each time it's called, so return
 * strings or cached objects.
 */
export function useClientValue<T>(read: () => T): T | null {
  return useSyncExternalStore(noSubscribe, read, () => null);
}

export function useBrowserTimeZone() {
  return useClientValue(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Today in the browser's timezone, as 'YYYY-MM-DD'. */
export function useToday() {
  return useClientValue(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
}
