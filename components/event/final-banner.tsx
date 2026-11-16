"use client";

import { Check, RotateCcw } from "lucide-react";
import { AddToCalendar } from "@/components/event/add-to-calendar";
import { PlaceLine } from "@/components/event/place";
import { useTimeZoneLabel } from "@/hooks/use-client-value";
import { attendance, describeFinal, type FinalRange } from "@/lib/final";
import { cn } from "@/lib/cn";
import type { OverlapEvent, Participant } from "@/lib/types";

/**
 * The headline once the organiser has picked a time: a bold card with the
 * final time in the viewer's timezone, who's coming, and "Add to calendar".
 */
export function FinalBanner({
  event,
  place,
  range,
  participants,
  meId,
  viewerTimeZone,
  onReopen,
  isBusy = false,
}: {
  event: OverlapEvent;
  /** Where it happens, if the organiser has said. */
  place: string | null;
  range: FinalRange;
  participants: Participant[];
  meId: string | null;
  viewerTimeZone: string;
  /** Organiser only. */
  onReopen?: () => void;
  isBusy?: boolean;
}) {
  const { day, time, duration } = describeFinal(event, range, viewerTimeZone);
  const { free, cantMake } = attendance(range, participants);
  const timeZone = useTimeZoneLabel(viewerTimeZone);

  return (
    <section
      aria-labelledby="final-heading"
      aria-live="polite"
      className="workspace-panel animate-fade-in overflow-hidden rounded-3xl border-t-4 border-t-[var(--heat)] p-5 sm:p-8"
    >
      <div>
        <h2 id="final-heading" className="moment-label inline-flex items-center gap-2"><span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--personal)] text-[var(--on-personal)]"><Check className="size-3.5" aria-hidden /></span>It’s a plan</h2>
        <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">{day}</p>
        <p className="mt-2 text-xl sm:text-2xl">
          {time} · {duration}
        </p>
        <p className="mt-2 text-sm text-muted">{timeZone} · Your selected timezone</p>
        {place && <PlaceLine place={place} className="mt-3 text-base" />}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {/* The calendar entry takes its location from the event's current place. */}
          <AddToCalendar event={{ ...event, place }} range={range} participants={participants} />
          {onReopen && (
            <button
              type="button"
              onClick={onReopen}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink transition hover:bg-subtle disabled:opacity-50"
            >
              <RotateCcw className="size-4" /> Reopen event
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <PeopleList label={`Coming (${free.length})`} people={free} meId={meId} />
          <PeopleList label={`Can't make it (${cantMake.length})`} people={cantMake} meId={meId} muted />
        </div>
      </div>
    </section>
  );
}

function PeopleList({
  label,
  people,
  meId,
  muted = false,
}: {
  label: string;
  people: Participant[];
  meId: string | null;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      {people.length === 0 ? (
        <p>—</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {people.map((p) => (
            <li
              key={p.id}
              className={cn(
                "rounded-full px-2.5 py-0.5",
                // Coming: solid chips. Can't make it: outlined.
                muted ? "border border-line text-muted" : "bg-[color-mix(in_oklch,var(--personal)_10%,var(--surface))] font-medium text-ink",
              )}
            >
              {p.name}
              {p.id === meId && " (you)"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
