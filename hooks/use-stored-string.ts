"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // changes from other tabs
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked (private mode, etc.)
  }
}

/**
 * A string remembered in this browser's localStorage. `null` during server
 * rendering and when nothing is stored. Every component using the same key
 * updates together, including across tabs.
 */
export function useStoredString(key: string) {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);

  const setValue = useCallback(
    (next: string | null) => {
      try {
        if (next === null) localStorage.removeItem(key);
        else localStorage.setItem(key, next);
      } catch {
        // Storage blocked: it just won't be remembered next visit.
      }
      listeners.forEach((notify) => notify());
    },
    [key],
  );

  return [value, setValue] as const;
}
