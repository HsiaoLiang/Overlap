"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { FinalState, Participant } from "@/lib/types";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Listen for changes to an event: its participants and its final time.
 *
 * Database triggers broadcast on the channel `event:<id>`: every join or save
 * as a "participant" message (002_realtime.sql), and closing or reopening the
 * event as an "event" message (003_finalise.sql). Each time we (re)connect — and when the tab becomes
 * visible again (phones often drop the connection in the background) — we
 * call `onResync`, so the caller can reload once and catch anything missed.
 */
export function useEventChannel(
  eventId: string,
  {
    onParticipant,
    onFinalChange,
    onResync,
  }: {
    onParticipant: (participant: Participant) => void;
    onFinalChange: (final: FinalState) => void;
    onResync: () => void;
  },
) {
  const [status, setStatus] = useState<LiveStatus>(() =>
    getBrowserClient() ? "connecting" : "offline",
  );

  // Effect events always see the latest props without re-subscribing.
  const handleParticipant = useEffectEvent(onParticipant);
  const handleFinalChange = useEffectEvent(onFinalChange);
  const handleResync = useEffectEvent(onResync);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`event:${eventId}`, { config: { private: false } })
      .on("broadcast", { event: "participant" }, ({ payload }) => {
        handleParticipant(payload as Participant);
      })
      .on("broadcast", { event: "event" }, ({ payload }) => {
        handleFinalChange(payload as FinalState);
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
