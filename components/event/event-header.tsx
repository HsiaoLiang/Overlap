import type { ReactNode } from "react";
import { CalendarCheck, CalendarDays, Clock, Globe } from "lucide-react";
import { ShareButtons } from "@/components/event/share-buttons";
import { describeDays, describeTimes } from "@/lib/event-summary";
import type { OverlapEvent } from "@/lib/types";

export function EventHeader({
  event,
  isClosed = false,
  organiserButton,
}: {
  event: OverlapEvent;
  isClosed?: boolean;
  /** Shown next to Share, for the organiser only. */
  organiserButton?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {event.name}
          </h1>
          {isClosed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-ink">
              <CalendarCheck className="size-3.5" aria-hidden /> Time picked
            </span>
          )}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden /> {describeDays(event)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden /> {describeTimes(event)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Globe className="size-4" aria-hidden /> {event.timezone.replaceAll("_", " ")}
          </li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        {organiserButton}
        <ShareButtons slug={event.slug} eventName={event.name} />
      </div>
    </div>
  );
}
