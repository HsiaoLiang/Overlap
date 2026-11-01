import { CalendarDays, Clock, Globe } from "lucide-react";
import { ShareButtons } from "@/components/event/share-buttons";
import { describeDays, describeTimes } from "@/lib/event-summary";
import type { OverlapEvent } from "@/lib/types";

export function EventHeader({ event }: { event: OverlapEvent }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
          {event.name}
        </h1>
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
      <ShareButtons slug={event.slug} eventName={event.name} />
    </div>
  );
}
