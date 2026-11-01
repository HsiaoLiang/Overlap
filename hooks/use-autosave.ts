"use client";

import { useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Save the latest value in the background, one request at a time.
 * If you keep painting while a save is in flight, we remember only the newest
 * value and send it as soon as the current request finishes.
 */
export function useAutosave<T>(save: (value: T) => Promise<{ ok: boolean; error?: string }>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const inFlight = useRef(false);

  async function flush() {
    if (inFlight.current || !pending.current) return;
    const { value } = pending.current;
    pending.current = null;
    inFlight.current = true;
    setStatus("saving");

    let result: { ok: boolean; error?: string };
    try {
      result = await save(value);
    } catch {
      result = { ok: false, error: "You seem to be offline." };
    }
    inFlight.current = false;

    if (!result.ok) {
      setStatus("error");
      setError(result.error ?? "Couldn't save.");
      return;
    }
    if (pending.current) flush();
    else setStatus("saved");
  }

  function queue(value: T) {
    pending.current = { value };
    setError(null);
    flush();
  }

  return { status, error, queue };
}
