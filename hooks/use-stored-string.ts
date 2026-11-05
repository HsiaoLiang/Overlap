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

/** Read a string from localStorage (null if missing or storage is blocked). */
export function readStoredString(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked (private mode, etc.)
  }
}

/** Save (or with null, remove) a string, and update every component using it. */
export function writeStoredString(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked: it just won't be remembered next visit.
  }
  listeners.forEach((notify) => notify());
}

/**
 * A string remembered in this browser's localStorage. `null` during server
 * rendering and when nothing is stored. Every component using the same key
 * updates together, including across tabs.
 */
export function useStoredString(key: string) {
  const value = useSyncExternalStore(subscribe, () => readStoredString(key), () => null);
  const setValue = useCallback((next: string | null) => writeStoredString(key, next), [key]);
  return [value, setValue] as const;
}
