"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TimeRange } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { describeRange } from "@/lib/slots";
import type { OverlapEvent, Participant } from "@/lib/types";

/** Pick a suggested time to highlight it on the heatmap. */
export function BestTimes({
  event,
  ranges,
  participants,
  viewerTimeZone,
  selectedId,
  onSelect,
}: {
  event: OverlapEvent;
  ranges: TimeRange[];
  participants: Participant[];
  viewerTimeZone: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const total = participants.length;

  return (
    <section aria-labelledby="best-times-heading">
      <h2 id="best-times-heading" className="mb-2 font-semibold">Best times</h2>

      {ranges.length === 0 ? (
        <p className="text-sm text-muted">
          {total === 0 ? "Suggested times appear as people respond." : "No one has marked any times yet."}
        </p>
      ) : (
        <ol id={listId} className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
          {ranges.map((range, index) => {
            const { day, time, duration } = describeRange(event, range.keys, viewerTimeZone);
            const freeIds = new Set(range.free.map((p) => p.id));
            const missing = participants.filter((p) => !freeIds.has(p.id));
            const isSelected = range.id === selectedId;
            const isBest = index === 0;

            return (
              <li key={range.id} className={!isBest && !expanded ? "hidden lg:list-item" : undefined}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : range.id)}
                  className={cn(
                    "flex h-full w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    isSelected ? "border-accent ring-1 ring-accent/40" : "border-line hover:border-line-strong",
                    isBest ? "bg-accent/[0.06]" : "bg-surface",
                  )}
                >
                  <span className="flex w-full flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-semibold">{day}</span>
                    <span className="text-xs text-muted tabular-nums">
                      <span className="font-semibold text-ink">{range.free.length}</span>/{total} free
                    </span>
                  </span>
                  <span className="text-sm">
                    {time} <span className="text-muted">· {duration}</span>
                  </span>
                  <span className="line-clamp-2 w-full text-xs wrap-anywhere text-muted">
                    {missing.length === 0
                      ? "Everyone's free"
                      : `Can't make it: ${missing.map((p) => p.name).join(", ")}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {ranges.length > 1 && (
        <button
          type="button"
          aria-controls={listId}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 flex min-h-11 items-center gap-1.5 rounded text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-accent lg:hidden"
        >
          {expanded ? "Show fewer times" : "Show more times"}
          <ChevronDown className={cn("size-4", expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </section>
  );
}
