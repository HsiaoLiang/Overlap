"use client";

import { useMemo, useState } from "react";
import { Globe, Lock, Users } from "lucide-react";
import { saveAvailability } from "@/app/actions";
import { JoinForm } from "@/components/event/join-form";
import { MyGrid } from "@/components/event/my-grid";
import { SaveStatus } from "@/components/event/save-status";
import { TimezoneSelect } from "@/components/timezone-select";
import { useAutosave } from "@/hooks/use-autosave";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import type { SelectMode } from "@/hooks/use-drag-select";
import { useStoredIdentity } from "@/hooks/use-stored-identity";
import { buildViewerGrid, slotKeys } from "@/lib/slots";
import type { OverlapEvent, Participant } from "@/lib/types";

/**
 * The interactive part of the event page. Holds the list of participants
 * (the single source of truth for both grids), who "you" are, and which
 * timezone you're viewing in.
 */
export function EventView({
  event,
  initialParticipants,
}: {
  event: OverlapEvent;
  initialParticipants: Participant[];
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [identity, setIdentity] = useStoredIdentity(event.slug);
  const me = participants.find((p) => p.id === identity?.participantId) ?? null;

  // Show times in the browser's timezone unless the viewer picks another.
  const browserTimeZone = useBrowserTimeZone();
  const [chosenTimeZone, setChosenTimeZone] = useState<string | null>(null);
  const viewerTimeZone = chosenTimeZone ?? browserTimeZone;

  const grid = useMemo(
    () => (viewerTimeZone ? buildViewerGrid(event, viewerTimeZone) : null),
    [event, viewerTimeZone],
  );
  const allKeys = useMemo(() => slotKeys(event), [event]);

  const autosave = useAutosave(saveAvailability);
  const mySlots = useMemo(() => new Set(me?.slots), [me?.slots]);

  /** Paint or erase slots: update the screen immediately, then save. */
  function handlePaint(keys: string[], mode: SelectMode) {
    if (!me) return;
    const next = new Set(me.slots);
    for (const key of keys) {
      if (mode === "add") next.add(key);
      else next.delete(key);
    }
    const slots = allKeys.filter((key) => next.has(key)); // keep a stable order
    setParticipants((list) => list.map((p) => (p.id === me.id ? { ...p, slots } : p)));
    autosave.queue({ participantId: me.id, pin: identity?.pin, slots });
  }

  function handleJoined(participant: Participant, pin: string | undefined) {
    setParticipants((list) =>
      list.some((p) => p.id === participant.id)
        ? list.map((p) => (p.id === participant.id ? participant : p))
        : [...list, participant],
    );
    setIdentity({ participantId: participant.id, pin });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Globe className="size-4" aria-hidden />
        <span>Times shown in</span>
        {viewerTimeZone && (
          <TimezoneSelect
            variant="ghost"
            aria-label="Timezone to show times in"
            value={viewerTimeZone}
            onChange={setChosenTimeZone}
          />
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-5">
          {!grid ? (
            <GridSkeleton />
          ) : me ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">Your availability</h2>
                  <p className="text-sm text-muted">
                    Responding as <span className="font-medium text-ink">{me.name}</span> ·{" "}
                    <button
                      type="button"
                      onClick={() => setIdentity(null)}
                      className="underline-offset-2 hover:text-ink hover:underline"
                    >
                      Not you?
                    </button>
                  </p>
                </div>
                <SaveStatus
                  status={autosave.status}
                  error={autosave.error}
                  onRetry={() =>
                    autosave.queue({ participantId: me.id, pin: identity?.pin, slots: me.slots })
                  }
                />
              </div>
              <MyGrid grid={grid} selected={mySlots} onChange={handlePaint} />
              <p className="mt-3 text-center text-xs text-muted">
                Tap or drag to mark when you&apos;re free. Changes save automatically.
              </p>
            </>
          ) : (
            <JoinForm slug={event.slug} onJoined={handleJoined} />
          )}
        </section>

        {/* Step 3 turns this into the group heatmap. */}
        <section className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-5">
          <h2 className="mb-4 font-semibold">Responses ({participants.length})</h2>
          {participants.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-subtle">
                <Users className="size-5 text-muted" aria-hidden />
              </div>
              <p className="font-medium">No one has responded yet</p>
              <p className="mt-1 text-sm text-muted">Share the link to get started.</p>
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm"
                >
                  {p.name}
                  {p.id === me?.id && <span className="text-muted">(you)</span>}
                  {p.hasPin && <Lock className="size-3 text-muted" aria-label="PIN protected" />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg bg-subtle" />;
}
