"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Globe, Lock } from "lucide-react";
import {
  finaliseEvent,
  loadEventSnapshot,
  reopenEvent,
  saveAvailability,
} from "@/app/actions";
import { BestTimes } from "@/components/event/best-times";
import { FinalBanner } from "@/components/event/final-banner";
import { GroupPanel } from "@/components/event/group-panel";
import { JoinForm } from "@/components/event/join-form";
import { MobileViewTabs, type MobileView } from "@/components/event/mobile-view-tabs";
import { MyGrid } from "@/components/event/my-grid";
import { ChooseAnotherTime, OrganiserLinkNotice } from "@/components/event/organiser";
import { SaveStatus } from "@/components/event/save-status";
import { TimezoneSelect } from "@/components/timezone-select";
import { useAutosave } from "@/hooks/use-autosave";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import type { SelectMode } from "@/hooks/use-drag-select";
import { useEventChannel, type LiveStatus } from "@/hooks/use-event-channel";
import { useHost } from "@/hooks/use-host";
import { useStoredIdentity } from "@/hooks/use-stored-identity";
import { bestTimes } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { finalRangeKeys, finalRangeOf, rangeFrom, type FinalRange } from "@/lib/final";
import { buildViewerGrid, slotKeys } from "@/lib/slots";
import { SLOT_MINUTES } from "@/lib/time";
import type { FinalState, OverlapEvent, Participant } from "@/lib/types";

/**
 * The interactive part of the event page. Holds the list of participants
 * (the single source of truth for both grids), who "you" are, which
 * timezone you're viewing in, and whether the organiser has closed the event.
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

  // Best times update automatically whenever anyone's availability changes.
  const ranges = useMemo(() => bestTimes(event, participants), [event, participants]);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const selectedRange = ranges.find((r) => r.id === selectedRangeId) ?? null;

  // The organiser's final time (null while the event is open). Updates live.
  const [final, setFinal] = useState<FinalState>({
    final_start: event.final_start,
    final_end: event.final_end,
    finalised_at: event.finalised_at,
  });
  const finalRange = finalRangeOf(final);
  const isClosed = finalRange !== null;
  const finalKeys = useMemo(() => {
    const range = finalRangeOf(final);
    return range ? finalRangeKeys(range) : null;
  }, [final]);

  // With many days the grids show a page at a time; both grids share it.
  const [firstColumn, setFirstColumn] = useState(0);
  const paging = { firstColumn, onFirstColumnChange: setFirstColumn };
  /** Turn to the page showing this slot (e.g. a best time the viewer tapped). */
  function showSlot(key: string) {
    const col = grid?.cells.map((cells) => cells.indexOf(key)).find((c) => c >= 0);
    if (col !== undefined) setFirstColumn(col);
  }

  // On phones the two panels become tabs; on wide screens they sit side by side.
  const [mobileTab, setMobileTab] = useState<MobileView>("mine");

  // A short "Bea updated" notice next to the Live badge.
  const [recentChange, setRecentChange] = useState<string | null>(null);
  const recentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const autosave = useAutosave(saveAvailability);
  const mySlots = useMemo(() => new Set(me?.slots), [me?.slots]);

  /** Paint or erase slots: update the screen immediately, then save. */
  function handlePaint(keys: string[], mode: SelectMode) {
    if (!me || isClosed) return;
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
    setParticipants((list) => upsert(list, participant));
    setIdentity({ participantId: participant.id, pin });
    // Our own "joined" broadcast can arrive before we know it's us: hide it.
    setRecentChange((notice) => (notice === `${participant.name} joined` ? null : notice));
  }

  // --- Organiser -----------------------------------------------------------

  const { hostToken, linkToSave, dismissLink } = useHost(event.slug);
  const [isOrganising, startOrganising] = useTransition();
  const [organiserError, setOrganiserError] = useState<string | null>(null);

  function pickFinal(range: FinalRange) {
    if (!hostToken) return;
    setOrganiserError(null);
    startOrganising(async () => {
      const result = await finaliseEvent({ slug: event.slug, token: hostToken, ...range });
      if (result.ok) {
        setFinal(result.final);
        setSelectedRangeId(null);
        showSlot(range.start);
      } else {
        setOrganiserError(result.error);
      }
    });
  }

  function reopen() {
    if (!hostToken) return;
    setOrganiserError(null);
    startOrganising(async () => {
      const result = await reopenEvent({ slug: event.slug, token: hostToken });
      if (result.ok) setFinal(result.final);
      else setOrganiserError(result.error);
    });
  }

  // --- Live updates -------------------------------------------------------

  const meId = me?.id ?? null;

  /** Someone else joined or saved. */
  function handleRemoteParticipant(incoming: Participant) {
    // Ignore echoes of our own saves: what's on our screen is already newer.
    if (incoming.id === meId) return;
    const isNew = !participants.some((p) => p.id === incoming.id);
    setParticipants((list) => upsert(list, incoming));

    setRecentChange(`${incoming.name} ${isNew ? "joined" : "updated"}`);
    clearTimeout(recentTimer.current);
    recentTimer.current = setTimeout(() => setRecentChange(null), 4000);
  }

  /** Reload everything after (re)connecting, in case we missed a message. Keeps our own answers. */
  async function resync() {
    const snapshot = await loadEventSnapshot(event.slug);
    if (!snapshot) return;
    setParticipants((list) => {
      const mine = list.find((p) => p.id === meId);
      if (!mine) return snapshot.participants;
      return upsert(snapshot.participants, mine);
    });
    setFinal(snapshot.final);
  }

  const liveStatus = useEventChannel(event.id, {
    onParticipant: handleRemoteParticipant,
    onFinalChange: setFinal, // the organiser closed or reopened the event
    onResync: resync,
  });

  return (
    <div className="mt-6 animate-fade-in space-y-4 pb-8 lg:pb-0">
      {linkToSave && <OrganiserLinkNotice link={linkToSave} onDismiss={dismissLink} />}

      {finalRange && viewerTimeZone && (
        <FinalBanner
          event={event}
          range={finalRange}
          participants={participants}
          meId={meId}
          viewerTimeZone={viewerTimeZone}
          onReopen={hostToken ? reopen : undefined}
          isBusy={isOrganising}
        />
      )}

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

      {viewerTimeZone ? (
        <BestTimes
          event={event}
          ranges={ranges}
          participants={participants}
          viewerTimeZone={viewerTimeZone}
          selectedId={selectedRange?.id ?? null}
          onSelect={(id) => {
            setSelectedRangeId(id);
            if (id) {
              setMobileTab("group"); // show it on the heatmap
              showSlot(id); // a range's id is its first slot key
            }
          }}
          onPick={
            hostToken && !isClosed
              ? (range) => pickFinal(rangeFrom(range.keys[0], range.keys.length * SLOT_MINUTES))
              : undefined
          }
          isPicking={isOrganising}
        />
      ) : (
        <div className="h-40 animate-pulse rounded-2xl bg-subtle" />
      )}

      {hostToken && !isClosed && viewerTimeZone && (
        <ChooseAnotherTime
          event={event}
          viewerTimeZone={viewerTimeZone}
          onPick={pickFinal}
          isPicking={isOrganising}
        />
      )}

      {organiserError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {organiserError}
        </p>
      )}

      <MobileViewTabs
        value={mobileTab}
        onChange={setMobileTab}
        groupCount={participants.length}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          className={cn(
            "min-w-0 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-5",
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
              <MyGrid
                grid={grid}
                selected={mySlots}
                onChange={handlePaint}
                readOnly={isClosed}
                paging={paging}
              />
              <p className="mt-3 text-center text-xs text-muted">
                {isClosed
                  ? "The organiser has picked a time, so answers are locked."
                  : "Tap or drag to mark when you're free. Changes save automatically."}
              </p>
            </>
          ) : isClosed ? (
            <ClosedNotice />
          ) : (
            <JoinForm slug={event.slug} onJoined={handleJoined} />
          )}
        </section>

        <section
          className={cn(
            "min-w-0 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-5",
            mobileTab !== "group" && "hidden lg:block",
          )}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Group availability</h2>
            <LiveBadge status={liveStatus} recentChange={recentChange} />
          </div>
          {grid ? (
            <GroupPanel
              grid={grid}
              participants={participants}
              meId={me?.id ?? null}
              highlightKeys={selectedRange?.keys ?? finalKeys}
              paging={paging}
            />
          ) : (
            <GridSkeleton />
          )}
        </section>
      </div>
    </div>
  );
}

/** Replace a participant by id, or add them if they're new. */
function upsert(list: Participant[], participant: Participant) {
  return list.some((p) => p.id === participant.id)
    ? list.map((p) => (p.id === participant.id ? participant : p))
    : [...list, participant];
}

function LiveBadge({ status, recentChange }: { status: LiveStatus; recentChange: string | null }) {
  const label = { live: "Live", connecting: "Connecting…", offline: "Offline" }[status];
  return (
    <span aria-live="polite" className="inline-flex items-center gap-2 text-xs text-muted">
      {recentChange && (
        <span className="animate-fade-in rounded-full bg-accent/10 px-2 py-0.5 text-accent-ink">
          {recentChange}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex size-2">
          {status === "live" && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              status === "live" ? "bg-accent" : status === "connecting" ? "bg-line-strong" : "bg-danger",
            )}
          />
        </span>
        {label}
      </span>
    </span>
  );
}

function ClosedNotice() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-subtle">
        <Lock className="size-5 text-muted" aria-hidden />
      </div>
      <p className="font-medium">Responses are closed</p>
      <p className="mt-1 text-sm text-muted">The organiser has picked a time. See it at the top.</p>
    </div>
  );
}

function GridSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg bg-subtle" />;
}
