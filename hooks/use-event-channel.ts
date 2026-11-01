"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { Participant } from "@/lib/types";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Listen for changes to an event's participants.
 *
 * A database trigger (supabase/migrations/002_realtime.sql) broadcasts every
 * join or save on the channel `event:<id>`. We pass each message to
 * `onParticipant`. Each time we (re)connect — and when the tab becomes
 * visible again (phones often drop the connection in the background) — we
 * call `onResync`, so the caller can reload once and catch anything missed.
 */
export function useEventChannel(
  eventId: string,
  {
    onParticipant,
    onResync,
  }: { onParticipant: (participant: Participant) => void; onResync: () => void },
) {
  const [status, setStatus] = useState<LiveStatus>(() =>
    getBrowserClient() ? "connecting" : "offline",
  );

  // Effect events always see the latest props without re-subscribing.
  const handleParticipant = useEffectEvent(onParticipant);
  const handleResync = useEffectEvent(onResync);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`event:${eventId}`, { config: { private: false } })
      .on("broadcast", { event: "participant" }, ({ payload }) => {
        handleParticipant(payload as Participant);
      })
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          setStatus("live");
          handleResync();
        } else {
          setStatus(state === "CLOSED" ? "offline" : "connecting");
        }
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") handleResync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return status;
}
