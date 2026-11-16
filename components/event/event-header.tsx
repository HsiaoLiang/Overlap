"use client";

import type { ReactNode } from "react";
import { CalendarCheck, CalendarDays, Clock, Globe } from "lucide-react";
import { PlaceLine } from "@/components/event/place";
import { ShareButtons } from "@/components/event/share-buttons";
import { useTimeZoneLabel } from "@/hooks/use-client-value";
import { describeDays, describeTimes } from "@/lib/event-summary";
import type { OverlapEvent } from "@/lib/types";

/**
 * The card at the top of an event: what it is, when, where, and how to share
 * it. The strip along the bottom (`footer`) is the viewer's own timezone.
 */
export function EventHeader({
  event,
  place,
  isClosed = false,
  organiserButton,
  placeEditor,
  footer,
}: {
  event: OverlapEvent;
  /** Where it happens (kept separately from `event`: the organiser can change it live). */
  place: string | null;
  isClosed?: boolean;
  /** Shown next to Share, for the organiser only. */
  organiserButton?: ReactNode;
  /** "Add a place" / "Edit", for the organiser only. */
  placeEditor?: ReactNode;
  footer: ReactNode;
}) {
  // The days and times above are in the event's timezone: "Tokyo time (GMT+9)".
  const timeZone = useTimeZoneLabel(event.timezone);

  return (
    <header className="workspace-panel overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6 sm:pb-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
              {event.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-subtle px-2.5 py-1 text-xs font-medium text-muted">
              {isClosed && <CalendarCheck className="size-3.5" aria-hidden />}
              {isClosed ? "Time confirmed" : "Finding a time"}
            </span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden /> {describeDays(event)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden /> {describeTimes(event)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Globe className="size-4" aria-hidden /> Event created in {timeZone}
            </li>
          </ul>
          {(place || placeEditor) && (
            <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-1 text-sm">
              {place && <PlaceLine place={place} className="text-ink" />}
              {placeEditor}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-48">
          {organiserButton}
          <ShareButtons slug={event.slug} eventName={event.name} />
        </div>
      </div>
      <div className="border-t border-line bg-subtle/40 px-4 py-3 sm:px-6">{footer}</div>
    </header>
  );
}
