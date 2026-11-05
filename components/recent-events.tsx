"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { forgetEvent, useRecentEvents, type EventRole } from "@/hooks/use-recent-events";
import { cn } from "@/lib/cn";

const ROLE_LABEL: Record<EventRole, string> = {
  organiser: "Organiser",
  participant: "Responded",
  visitor: "Viewed",
};

/** "5 minutes ago", "yesterday", "3 days ago" */
function timeAgo(ms: number) {
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round((ms - Date.now()) / 60_000);
  if (minutes > -60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}

/** Events this device created, answered or opened. Hidden when there are none. */
export function RecentEvents() {
  const events = useRecentEvents();
  if (events.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="mt-10 max-w-md animate-fade-in">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="recent-heading" className="font-semibold">
          Your events
        </h2>
        <span className="text-xs text-muted">Saved on this device</span>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {events.slice(0, 8).map((event) => (
          <li key={event.slug} className="flex items-center gap-2 pr-2 transition-colors hover:bg-subtle">
            <Link
              href={`/e/${event.slug}`}
              className="min-w-0 flex-1 px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <p className="truncate font-medium">{event.name}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px",
                    event.role === "organiser" ? "bg-accent/10 text-accent-ink" : "bg-subtle",
                  )}
                >
                  {ROLE_LABEL[event.role]}
                </span>
                {timeAgo(event.lastVisited)}
              </p>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove “${event.name}” from this list`}
              onClick={() => forgetEvent(event.slug)}
            >
              <X className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
