"use client";

import { useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { saveAvailability } from "@/app/actions";
import { GroupPanel } from "@/components/event/group-panel";
import { JoinForm } from "@/components/event/join-form";
import { MyGrid } from "@/components/event/my-grid";
import { SaveStatus } from "@/components/event/save-status";
import { TimezoneSelect } from "@/components/timezone-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAutosave } from "@/hooks/use-autosave";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import type { SelectMode } from "@/hooks/use-drag-select";
import { useStoredIdentity } from "@/hooks/use-stored-identity";
import { cn } from "@/lib/cn";
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

  // On phones the two panels become tabs; on wide screens they sit side by side.
  const [mobileTab, setMobileTab] = useState<"mine" | "group">("mine");

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

      <div className="lg:hidden">
        <SegmentedControl
          label="Show"
          value={mobileTab}
          onChange={setMobileTab}
          options={[
            { value: "mine", label: "Your availability" },
            { value: "group", label: `Group (${participants.length})` },
          ]}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          className={cn(
            "rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-5",
            mobileTab !== "mine" && "hidden lg:block",
          )}
        >
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

        <section
          className={cn(
            "rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-5",
            mobileTab !== "group" && "hidden lg:block",
          )}
        >
          <h2 className="mb-4 font-semibold">Group availability</h2>
          {grid ? (
            <GroupPanel grid={grid} participants={participants} meId={me?.id ?? null} />
          ) : (
            <GridSkeleton />
          )}
        </section>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg bg-subtle" />;
}
