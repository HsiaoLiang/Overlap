"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Globe } from "lucide-react";
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
import { EventHeader } from "@/components/event/event-header";
import { OrganiserButton, PickFinalTime } from "@/components/event/organiser";
import { SaveStatus } from "@/components/event/save-status";
import { TimezonePicker } from "@/components/timezone-picker";
import { useAutosave } from "@/hooks/use-autosave";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import type { SelectMode } from "@/hooks/use-drag-select";
import { useEventChannel, type LiveStatus } from "@/hooks/use-event-channel";
import { useHost } from "@/hooks/use-host";
import { rememberEvent } from "@/hooks/use-recent-events";
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
  // Organiser: the best time last tapped, loaded into "Pick the final time".
  // `n` changes on every tap so the panel starts over from it.
  const [preset, setPreset] = useState<{ range: FinalRange; n: number } | null>(null);

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
  const [mobileTab, setMobileTab] = useState<MobileView | null>(null);
  const showMine = !isClosed || me !== null;
  const activeTab = showMine ? mobileTab ?? (isClosed ? "group" : "mine") : "group";
  const availabilityStart = useRef<HTMLDivElement>(null);
  const myHeading = useRef<HTMLHeadingElement>(null);
  const focusAfterJoin = useRef(false);
  const participantId = me?.id ?? null;

  useEffect(() => {
    if (!focusAfterJoin.current || !participantId || !grid || isClosed) return;
    focusAfterJoin.current = false;
    myHeading.current?.focus({ preventScroll: true });
    myHeading.current?.scrollIntoView({ block: "start" });
  }, [grid, isClosed, participantId]);

  function switchAvailability(view: MobileView) {
    if (view === activeTab) return;
    setMobileTab(view);
    const start = availabilityStart.current;
    if (start && start.getBoundingClientRect().top < 0) {
      requestAnimationFrame(() => start.scrollIntoView({ block: "start" }));
    }
  }

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
    focusAfterJoin.current = true;
    setFirstColumn(0);
    setMobileTab("mine");
    setParticipants((list) => upsert(list, participant));
    setIdentity({ participantId: participant.id, pin });
    // Our own "joined" broadcast can arrive before we know it's us: hide it.
    setRecentChange((notice) => (notice === `${participant.name} joined` ? null : notice));
  }

  // --- Organiser -----------------------------------------------------------

  const hostToken = useHost(event.slug);

  // Remember this event on the home page's "Your events" (this device only).
  const role = hostToken ? "organiser" : me ? "participant" : "visitor";
  useEffect(() => {
    rememberEvent({ slug: event.slug, name: event.name, role });
  }, [event.slug, event.name, role]);
  const [isOrganising, startOrganising] = useTransition();
  const [organiserError, setOrganiserError] = useState<string | null>(null);
  const focusAfterFinalising = useRef(false);

  useEffect(() => {
    if (!focusAfterFinalising.current || !isClosed || !viewerTimeZone) return;
    focusAfterFinalising.current = false;
    const heading = document.getElementById("final-heading");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  }, [final, isClosed, viewerTimeZone]);

  function pickFinal(range: FinalRange) {
    if (!hostToken) return;
    setOrganiserError(null);
    startOrganising(async () => {
      const result = await finaliseEvent({ slug: event.slug, token: hostToken, ...range });
      if (result.ok) {
        focusAfterFinalising.current = true;
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

  const meId = participantId;

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

  const saveStatus = me && !isClosed && (
    <SaveStatus
      status={autosave.status}
      error={autosave.error}
      onRetry={() =>
        autosave.queue({ participantId: me.id, pin: identity?.pin, slots: me.slots })
      }
    />
  );

  return (
    <div className="space-y-4">
      <EventHeader
        event={event}
        isClosed={isClosed}
        organiserButton={
          hostToken && <OrganiserButton slug={event.slug} token={hostToken} eventName={event.name} />
        }
      />

      {finalRange && (
        viewerTimeZone ? (
          <FinalBanner
            event={event}
            range={finalRange}
            participants={participants}
            meId={meId}
            viewerTimeZone={viewerTimeZone}
            onReopen={hostToken ? reopen : undefined}
            isBusy={isOrganising}
          />
        ) : (
          <div className="h-52 animate-pulse rounded-2xl bg-subtle" role="status">
            <span className="sr-only">Loading final time</span>
          </div>
        )
      )}

      {organiserError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {organiserError}
        </p>
      )}

      <div ref={availabilityStart} className="space-y-4">
        {showMine && (
          <MobileViewTabs
            value={activeTab}
            onChange={switchAvailability}
            groupCount={participants.length}
            saveStatus={activeTab === "mine" ? saveStatus : null}
            isClosed={isClosed}
          />
        )}

        {viewerTimeZone && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-1 text-sm text-muted",
              !me && activeTab === "mine" && "hidden lg:flex",
            )}
          >
            <Globe className="size-4" aria-hidden />
            <span>Times shown in</span>
            <TimezonePicker
              variant="inline"
              value={viewerTimeZone}
              onChange={setChosenTimeZone}
              suggestions={[
                ...(browserTimeZone ? [{ id: browserTimeZone, note: "Your timezone" }] : []),
                { id: event.timezone, note: "Event's timezone" },
              ]}
            />
          </div>
        )}

        {!isClosed && (
          <div
            id="group-recommendations"
            className={cn("space-y-4", activeTab !== "group" && "hidden lg:block")}
          >
            {viewerTimeZone ? (
              <BestTimes
                event={event}
                ranges={ranges}
                participants={participants}
                viewerTimeZone={viewerTimeZone}
                selectedId={selectedRange?.id ?? null}
                onSelect={(id) => {
                  setSelectedRangeId(id);
                  const range = ranges.find((r) => r.id === id);
                  if (!range) return;
                  showSlot(range.id);
                  if (hostToken) {
                    const final = rangeFrom(range.keys[0], range.keys.length * SLOT_MINUTES);
                    setPreset((p) => ({ range: final, n: (p?.n ?? 0) + 1 }));
                    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    requestAnimationFrame(() =>
                      document
                        .getElementById("pick-final")
                        ?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }),
                    );
                  }
                }}
              />
            ) : (
              <div className="h-24 animate-pulse rounded-xl bg-subtle" aria-hidden />
            )}

            {hostToken && viewerTimeZone && (
              <PickFinalTime
                key={preset?.n ?? 0}
                event={event}
                participants={participants}
                viewerTimeZone={viewerTimeZone}
                suggested={
                  preset?.range ??
                  (ranges[0]
                    ? rangeFrom(ranges[0].keys[0], ranges[0].keys.length * SLOT_MINUTES)
                    : undefined)
                }
                onPick={pickFinal}
                isPicking={isOrganising}
              />
            )}
          </div>
        )}

        <div className={cn("grid items-start gap-6", showMine && "lg:grid-cols-2")}>
          {showMine && (
            <section
              id="your-availability-panel"
              className={cn(
                "min-w-0 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-5",
                activeTab !== "mine" && "hidden lg:block",
              )}
            >
              {me ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2">
                    <div className="min-w-0">
                      <h2
                        ref={myHeading}
                        tabIndex={-1}
                        className="scroll-mt-24 font-semibold focus-visible:outline-2 focus-visible:outline-accent lg:scroll-mt-5"
                      >
                        Your availability
                      </h2>
                      <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
                        <span className="min-w-0 wrap-anywhere">
                          Responding as <strong className="font-medium text-ink">{me.name}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIdentity(null)}
                          className="min-h-11 rounded px-1 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          Not you?
                        </button>
                      </p>
                    </div>
                    {!isClosed && <div className="hidden lg:block">{saveStatus}</div>}
                  </div>

                  {grid ? (
                    <MyGrid
                      grid={grid}
                      selected={mySlots}
                      onChange={handlePaint}
                      readOnly={isClosed}
                      paging={paging}
                    />
                  ) : (
                    <GridSkeleton />
                  )}
                  {isClosed ? (
                    <p className="mt-3 text-sm text-muted">
                      The organiser has picked a time. Responses are closed.
                    </p>
                  ) : (
                    <p className="mt-3 hidden text-sm text-muted lg:block">
                      Click or drag to mark when you&apos;re free.
                    </p>
                  )}
                </>
              ) : (
                <JoinForm slug={event.slug} onJoined={handleJoined} />
              )}
            </section>
          )}

          <section
            id="group-availability-panel"
            className={cn(
              "min-w-0 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-5",
              activeTab !== "group" && "hidden lg:block",
            )}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Group availability</h2>
              <LiveBadge status={liveStatus} recentChange={recentChange} />
            </div>
            {grid ? (
              <GroupPanel
                grid={grid}
                participants={participants}
                meId={meId}
                highlightKeys={selectedRange?.keys ?? finalKeys}
                paging={paging}
              />
            ) : (
              <GridSkeleton />
            )}
          </section>
        </div>
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
    <span aria-live="polite" className="inline-flex min-w-0 items-center gap-2 text-xs text-muted">
      {recentChange && (
        <span className="min-w-0 animate-fade-in rounded-full bg-accent/10 px-2 py-0.5 wrap-anywhere text-accent-ink">
          {recentChange}
        </span>
      )}
      <span className="inline-flex shrink-0 items-center gap-1.5">
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

function GridSkeleton() {
  return <div className="h-96 animate-pulse rounded-lg bg-subtle" />;
}
