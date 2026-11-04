"use client";

import { CalendarCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimeRange } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { describeRange } from "@/lib/slots";
import type { OverlapEvent, Participant } from "@/lib/types";

/**
 * "Best times" summary: the top ranges where the most people are free.
 * Tapping one highlights it on the group heatmap. The organiser also gets a
 * "Pick this time" button on each card (`onPick`).
 */
export function BestTimes({
  event,
  ranges,
  participants,
  viewerTimeZone,
  selectedId,
  onSelect,
  onPick,
  isPicking = false,
}: {
  event: OverlapEvent;
  ranges: TimeRange[];
  participants: Participant[];
  viewerTimeZone: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Organiser only: close the event with this range as the final time. */
  onPick?: (range: TimeRange) => void;
  isPicking?: boolean;
}) {
  const total = participants.length;

  return (
    <section aria-labelledby="best-times-heading">
      <h2 id="best-times-heading" className="mb-3 flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-accent-ink" aria-hidden />
        Best times
      </h2>

      {ranges.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-muted">
          {total === 0
            ? "No one has responded yet. Best times will show up here as people add their availability."
            : "No one has marked any times yet."}
        </p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {ranges.map((range, index) => {
            const { day, time, duration } = describeRange(event, range.keys, viewerTimeZone);
            const freeIds = new Set(range.free.map((p) => p.id));
            const missing = participants.filter((p) => !freeIds.has(p.id));
            const isSelected = range.id === selectedId;
            const isBest = index === 0;

            return (
              <li
                key={range.id}
                className={cn(
                  "flex animate-fade-in flex-col overflow-hidden rounded-2xl border shadow-sm transition",
                  "hover:-translate-y-0.5 hover:shadow-md",
                  isSelected
                    ? "border-accent ring-2 ring-accent/30"
                    : isBest
                      ? "border-accent/40"
                      : "border-line",
                  isBest ? "bg-accent/[0.06]" : "bg-surface",
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : range.id)}
                  className="w-full flex-1 p-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-medium",
                        isBest ? "bg-accent text-on-accent" : "bg-subtle text-muted",
                      )}
                    >
                      {isBest ? "Best" : `#${index + 1}`}
                    </span>
                    <span className="text-muted tabular-nums">
                      <span className="font-semibold text-ink">{range.free.length}</span>/{total}{" "}
                      free
                    </span>
                  </div>

                  {/* Phones: day and time on one line to save space. */}
                  <p className="mt-2 sm:mt-3">
                    <span className="font-semibold">{day}</span>
                    <span className="max-sm:hidden">
                      <br />
                    </span>
                    <span className="text-sm">
                      <span className="sm:hidden"> · </span>
                      {time} <span className="text-muted">· {duration}</span>
                    </span>
                  </p>

                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle max-sm:hidden"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${(range.free.length / total) * 100}%` }}
                    />
                  </div>

                  <p className="mt-1 truncate text-xs text-muted sm:mt-2">
                    {missing.length === 0
                      ? "Everyone's free"
                      : `Can't make it: ${missing.map((p) => p.name).join(", ")}`}
                  </p>
                </button>
                {onPick && (
                  <div className="border-t border-line px-3 py-2 sm:px-4">
                    <Button
                      size="sm"
                      variant={isBest ? "primary" : "secondary"}
                      className="w-full"
                      disabled={isPicking}
                      onClick={() => onPick(range)}
                    >
                      <CalendarCheck className="size-4" /> Pick this time
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
