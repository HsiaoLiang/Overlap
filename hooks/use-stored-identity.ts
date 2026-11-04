"use client";

import { useCallback, useMemo } from "react";
import { useStoredString } from "@/hooks/use-stored-string";

/** Who you are in an event, remembered in this browser. */
export type Identity = { participantId: string; pin?: string };

/**
 * Remember which participant you are for an event, so coming back to the link
 * drops you straight into your grid. Stored in localStorage per event.
 */
export function useStoredIdentity(slug: string) {
  const [raw, setRaw] = useStoredString(`overlap:${slug}`);

  const identity = useMemo<Identity | null>(() => {
    try {
      return raw ? (JSON.parse(raw) as Identity) : null;
    } catch {
      return null;
    }
  }, [raw]);

  const setIdentity = useCallback(
    (value: Identity | null) => setRaw(value ? JSON.stringify(value) : null),
    [setRaw],
  );

  return [identity, setIdentity] as const;
}
