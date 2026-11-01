"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Who you are in an event, remembered in this browser. */
export type Identity = { participantId: string; pin?: string };

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
 * Remember which participant you are for an event, so coming back to the link
 * drops you straight into your grid. Stored in localStorage per event.
 */
export function useStoredIdentity(slug: string) {
  const key = `overlap:${slug}`;
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);

  const identity = useMemo<Identity | null>(() => {
    try {
      return raw ? (JSON.parse(raw) as Identity) : null;
    } catch {
      return null;
    }
  }, [raw]);

  const setIdentity = useCallback(
    (value: Identity | null) => {
      try {
        if (value) localStorage.setItem(key, JSON.stringify(value));
        else localStorage.removeItem(key);
      } catch {
        // Storage blocked: you'll just need to rejoin next visit.
      }
      listeners.forEach((notify) => notify());
    },
    [key],
  );

  return [identity, setIdentity] as const;
}
