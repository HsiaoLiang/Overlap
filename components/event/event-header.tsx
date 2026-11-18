"use client";

import type { ReactNode } from "react";
import { CalendarDays, Clock, Ellipsis, Globe } from "lucide-react";
import { ShareButtons } from "@/components/event/share-buttons";
import { useTimeZoneLabel } from "@/hooks/use-client-value";
import { describeDays, describeTimes } from "@/lib/event-summary";
import type { OverlapEvent } from "@/lib/types";

export function EventHeader({
  event,
  isClosed = false,
  organiserButton,
}: {
  event: OverlapEvent;
  isClosed?: boolean;
  /** Shown in Event links, for the organiser only. */
  organiserButton?: ReactNode;
}) {
  const timeZone = useTimeZoneLabel(event.timezone);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 pt-1">
        <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
          {event.name}
        </h1>
        {!isClosed && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            <li className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden /> {describeDays(event)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden /> {describeTimes(event)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Globe className="size-4" aria-hidden /> {timeZone}
            </li>
          </ul>
        )}
      </div>
      <details className="relative shrink-0">
        <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <Ellipsis className="size-5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Event links</span>
        </summary>
        <div className="absolute top-full right-0 z-30 mt-1 flex w-max max-w-[calc(100vw-2rem)] flex-wrap gap-2 rounded-xl border border-line bg-surface p-2 shadow-md">
          <ShareButtons slug={event.slug} eventName={event.name} />
          {organiserButton}
        </div>
      </details>
    </div>
  );
}
