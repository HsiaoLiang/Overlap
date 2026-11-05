"use client";

import { RotateCcw } from "lucide-react";
import { AddToCalendar } from "@/components/event/add-to-calendar";
import { attendance, describeFinal, type FinalRange } from "@/lib/final";
import { cn } from "@/lib/cn";
import type { OverlapEvent, Participant } from "@/lib/types";

/**
 * The headline once the organiser has picked a time: a bold card with the
 * final time in the viewer's timezone, who's coming, and "Add to calendar".
 */
export function FinalBanner({
  event,
  range,
  participants,
  meId,
  viewerTimeZone,
  onReopen,
  isBusy = false,
}: {
  event: OverlapEvent;
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

  return (
    <section
      aria-labelledby="final-heading"
      aria-live="polite"
      className="relative animate-fade-in rounded-3xl bg-accent p-5 text-on-accent shadow-lg sm:p-7"
    >
      {/* Two overlapping circles: the Overlap logo, as decoration. Clipped on
          its own layer, so the calendar menu can still open past the card. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <svg viewBox="0 0 200 120" className="absolute -top-6 -right-10 w-64 opacity-15 sm:w-80">
          <circle cx="70" cy="60" r="55" fill="white" />
          <circle cx="130" cy="60" r="55" fill="white" />
        </svg>
      </div>

      <div className="relative">
        <h2 id="final-heading" className="text-xs font-semibold tracking-widest uppercase opacity-80">
          It&apos;s decided · Final time
        </h2>
        <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{day}</p>
        <p className="mt-1 text-xl sm:text-2xl">
          {time} <span className="opacity-75">· {duration}</span>
        </p>
        <p className="mt-1 text-sm opacity-75">{viewerTimeZone.replaceAll("_", " ")} time</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <AddToCalendar event={event} range={range} participants={participants} />
          {onReopen && (
            <button
              type="button"
              onClick={onReopen}
              disabled={isBusy}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-on-accent/90 ring-1 ring-white/40 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RotateCcw className="size-4" /> Reopen event
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-3 border-t border-white/20 pt-4 text-sm sm:grid-cols-2">
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
      <p className="mb-1.5 text-xs font-semibold tracking-wide uppercase opacity-80">{label}</p>
      {people.length === 0 ? (
        <p className="opacity-60">—</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {people.map((p) => (
            <li
              key={p.id}
              className={cn(
                "rounded-full px-2.5 py-0.5",
                muted ? "bg-black/15 opacity-75" : "bg-white/20",
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
