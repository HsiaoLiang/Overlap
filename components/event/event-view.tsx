"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, Check, ChevronDown, Globe, X } from "lucide-react";
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
import { PlaceEditor } from "@/components/event/place";
import { SaveStatus } from "@/components/event/save-status";
import { setSkyBase, setSkyHover, setSkyTimeZone } from "@/components/sky";
import { TimezonePicker } from "@/components/timezone-picker";
import { useAutosave } from "@/hooks/use-autosave";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import type { SelectMode } from "@/hooks/use-drag-select";
import { useEventChannel, type EventUpdate, type LiveStatus } from "@/hooks/use-event-channel";
import { useHost } from "@/hooks/use-host";
import { rememberEvent } from "@/hooks/use-recent-events";
import { useStoredIdentity } from "@/hooks/use-stored-identity";
import { bestTimes } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { finalRangeKeys, finalRangeOf, rangeFrom, type FinalRange } from "@/lib/final";
import { timeToMinutes } from "@/lib/sky";
import { buildViewerGrid, slotKeys, slotStartInstant, zonedParts } from "@/lib/slots";
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
  const [isNewResponse, setIsNewResponse] = useState(false);
  const me = participants.find((p) => p.id === identity?.participantId) ?? null;

  // Show times in the browser's timezone unless the viewer picks another.
  const browserTimeZone = useBrowserTimeZone();
  const [chosenTimeZone, setChosenTimeZone] = useState<string | null>(null);
  const viewerTimeZone = chosenTimeZone ?? browserTimeZone;

  useEffect(() => {
    setSkyTimeZone(viewerTimeZone);
    return () => setSkyTimeZone(null);
  }, [viewerTimeZone]);

  const grid = useMemo(
    () => (viewerTimeZone ? buildViewerGrid(event, viewerTimeZone) : null),
    [event, viewerTimeZone],
  );
  const allKeys = useMemo(() => slotKeys(event), [event]);

  // Best times update automatically whenever anyone's availability changes.
  const ranges = useMemo(() => bestTimes(event, participants), [event, participants]);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewRange = ranges.find((r) => r.id === previewId) ?? null;
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

  // Where it happens. The organiser can add or change it at any time; updates live.
  const [place, setPlace] = useState(event.place);
  const finalKeys = useMemo(() => {
    const range = finalRangeOf(final);
    return range ? finalRangeKeys(range) : null;
  }, [final]);

  // The atmosphere changes only when a candidate is explicitly previewed.
  useEffect(() => {
    if (!previewRange || !viewerTimeZone || isClosed) {
      setSkyHover(null);
      return;
    }
    const { time } = zonedParts(slotStartInstant(event, previewRange.keys[0]), viewerTimeZone);
    setSkyHover(timeToMinutes(time));
    return () => setSkyHover(null);
  }, [event, previewRange, viewerTimeZone, isClosed]);

  // Once a time is picked, the page's sky rests on it (in the viewer's timezone).
  const finalStart = final.final_start;
  useEffect(() => {
    if (!finalStart || !viewerTimeZone) return;
    const { time } = zonedParts(slotStartInstant(event, finalStart), viewerTimeZone);
    setSkyBase(timeToMinutes(time));
    return () => setSkyBase(null);
  }, [event, finalStart, viewerTimeZone]);

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
    setIsNewResponse(true);
    setMobileTab("mine");
    requestAnimationFrame(() => {
      const panel = document.getElementById("your-availability");
      panel?.focus({ preventScroll: true });
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
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

  function pickFinal(range: FinalRange) {
    if (!hostToken) return;
    setOrganiserError(null);
    startOrganising(async () => {
      const result = await finaliseEvent({ slug: event.slug, token: hostToken, ...range });
      if (result.ok) {
        setFinal(result.final);
        setPreviewId(null);
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
    if (snapshot.final.final_start) setPreviewId(null);
    setPlace(snapshot.place);
  }

  /** The organiser closed or reopened the event, or changed where it is. */
  function handleEventUpdate({ place: newPlace, ...newFinal }: EventUpdate) {
    setFinal(newFinal);
    if (newFinal.final_start) setPreviewId(null);
    if (newPlace !== undefined) setPlace(newPlace);
  }

  const liveStatus = useEventChannel(event.id, {
    onParticipant: handleRemoteParticipant,
    onFinalChange: handleEventUpdate,
    onResync: resync,
  });

  const firstResponse = isNewResponse && !!me && !hostToken;
  const recommendations = (
    isClosed ? null : viewerTimeZone ? (
        <BestTimes
          event={event}
          ranges={ranges}
          participants={participants}
          viewerTimeZone={viewerTimeZone}
          selectedId={selectedRange?.id ?? null}
          previewId={previewId}
          onPreview={setPreviewId}
          onSelect={(id) => {
            setSelectedRangeId(id);
            const range = ranges.find((r) => r.id === id);
            if (!range) return;
            setMobileTab("group"); // show it on the heatmap
            showSlot(range.id); // a range's id is its first slot key
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
        <div className="workspace-panel h-32 animate-pulse rounded-3xl" />
      )
  );

  const gridPanels = (
    <>
      {me && <MobileViewTabs value={mobileTab} onChange={setMobileTab} groupCount={participants.length} />}
      <div className={cn("grid items-start gap-5", me && "lg:grid-cols-2")}>
        {me && (
          <section id="your-availability" tabIndex={-1} className={cn("workspace-panel min-w-0 scroll-mt-5 rounded-3xl p-4 sm:p-6", mobileTab !== "mine" && "hidden lg:block")}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="moment-label mb-1">01 / Your response</p>
                <h2 className="text-lg font-semibold">When are you free?</h2>
                <p className="mt-1 text-sm text-muted">
                  {me.name} · <button type="button" onClick={() => setIdentity(null)} className="rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent">Not you?</button>
                </p>
              </div>
              <SaveStatus status={autosave.status} error={autosave.error} onRetry={() => autosave.queue({ participantId: me.id, pin: identity?.pin, slots: me.slots })} />
            </div>
            {grid ? <MyGrid grid={grid} selected={mySlots} onChange={handlePaint} readOnly={isClosed} paging={paging} /> : <GridSkeleton />}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-2"><span aria-hidden className="size-3 rounded-sm bg-[var(--personal)]" />Your available times</span>
              <span>{isClosed ? "Responses are locked" : "Tap or drag · saves automatically"}</span>
            </div>
          </section>
        )}
        <section id="group-availability" className={cn("workspace-panel min-w-0 scroll-mt-5 rounded-3xl p-4 sm:p-6", me && mobileTab !== "group" && "hidden lg:block")}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div><p className="moment-label mb-1">02 / The overlap</p><h2 className="text-lg font-semibold">Find your common ground.</h2></div>
            <LiveBadge status={liveStatus} recentChange={recentChange} />
          </div>
          {grid ? <GroupPanel grid={grid} participants={participants} meId={meId} highlightKeys={selectedRange?.keys ?? finalKeys} paging={paging} /> : <GridSkeleton />}
        </section>
      </div>
    </>
  );

  return (
    <div className="animate-fade-in space-y-5 pb-8 lg:pb-0">
      <EventHeader
        event={event}
        place={place}
        isClosed={isClosed}
        organiserButton={
          hostToken && <OrganiserButton slug={event.slug} token={hostToken} eventName={event.name} />
        }
        placeEditor={
          hostToken && (
            <PlaceEditor slug={event.slug} token={hostToken} place={place} onSaved={setPlace} />
          )
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Globe className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="text-muted">Your view</span>
              {viewerTimeZone ? <TimezonePicker variant="inline" value={viewerTimeZone} onChange={setChosenTimeZone} suggestions={[
                ...(browserTimeZone ? [{ id: browserTimeZone, note: "Your timezone" }] : []),
                { id: event.timezone, note: "Event's timezone" },
              ]} /> : <span className="text-muted">Detecting timezone…</span>}
            </div>
            <p className="text-xs text-muted">Grid, suggestions and final time use this timezone.</p>
          </div>
        }
      />

      {!me && !isClosed && (
        <section id="join-event" className="workspace-panel rounded-3xl px-5 py-1 sm:grid sm:grid-cols-2 sm:items-center sm:gap-10 sm:px-8">
          <div className="hidden py-6 sm:block">
            <p className="moment-label mb-3">Start with your time</p>
            <h2 className="text-3xl font-semibold tracking-tight">A little space<br />for everyone.</h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">Add your name, mark the times that work, and let the overlap take shape. No account needed.</p>
          </div>
          <JoinForm slug={event.slug} onJoined={handleJoined} />
        </section>
      )}

      {finalRange && viewerTimeZone && (
        <FinalBanner
          event={event}
          place={place}
          range={finalRange}
          participants={participants}
          meId={meId}
          viewerTimeZone={viewerTimeZone}
          onReopen={hostToken ? reopen : undefined}
          isBusy={isOrganising}
        />
      )}

      {previewRange && !isClosed && viewerTimeZone && (
        <div role="status" className="workspace-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm">
          <span className="min-w-0 [overflow-wrap:anywhere]">Sky preview · {zonedParts(slotStartInstant(event, previewRange.keys[0]), viewerTimeZone).time} · {viewerTimeZone.replaceAll("_", " ")}</span>
          <button type="button" onClick={() => setPreviewId(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"><X className="size-4" aria-hidden />End preview</button>
        </div>
      )}

      {!firstResponse && recommendations}

      {hostToken && !isClosed && viewerTimeZone && (
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

      {organiserError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {organiserError}
        </p>
      )}

      {!isClosed && me && (
        <p className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
          <span className="inline-flex items-center gap-2"><Check className="size-4" aria-hidden />Your response and the group stay in sync.</span>
          <a href="#group-availability" onClick={() => setMobileTab("group")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg font-medium text-ink underline underline-offset-4">See the overlap <ArrowDown className="size-4" aria-hidden /></a>
        </p>
      )}

      {isClosed ? (
        <details className="group/answers workspace-panel rounded-3xl p-4 sm:p-6">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg font-medium focus-visible:outline-2 focus-visible:outline-accent">
            View the responses <ChevronDown className="size-4 transition-transform group-open/answers:rotate-180" aria-hidden />
          </summary>
          <div className="mt-5">{gridPanels}</div>
        </details>
      ) : gridPanels}
      {firstResponse && recommendations}
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
            <span className="absolute inline-flex size-full rounded-full bg-[var(--personal)] opacity-30" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              status === "live" ? "bg-[var(--personal)]" : status === "connecting" ? "bg-line-strong" : "bg-danger",
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
