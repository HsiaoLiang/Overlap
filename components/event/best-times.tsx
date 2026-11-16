"use client";

import { ArrowUpRight, Check, ChevronDown, CloudSun } from "lucide-react";
import type { TimeRange } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { describeRange } from "@/lib/slots";
import type { OverlapEvent, Participant } from "@/lib/types";

/** A leading recommendation, with alternatives available without crowding the task. */
export function BestTimes({
  event,
  ranges,
  participants,
  viewerTimeZone,
  selectedId,
  previewId,
  onSelect,
  onPreview,
}: {
  event: OverlapEvent;
  ranges: TimeRange[];
  participants: Participant[];
  viewerTimeZone: string;
  selectedId: string | null;
  previewId: string | null;
  onSelect: (id: string | null) => void;
  onPreview: (id: string | null) => void;
}) {
  const total = participants.length;

  function candidate(range: TimeRange, index: number) {
    const { day, time, duration } = describeRange(event, range.keys, viewerTimeZone);
    const freeIds = new Set(range.free.map((p) => p.id));
    const missing = participants.filter((p) => !freeIds.has(p.id));
    const isSelected = range.id === selectedId;
    const isBest = index === 0;
    const isPreview = previewId === range.id;

    return (
      <div key={range.id} className={cn("overflow-hidden rounded-2xl border bg-surface", isSelected ? "border-accent ring-1 ring-accent" : "border-line")}>
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(isSelected ? null : range.id)}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:p-5"
        >
          <span className="min-w-0">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              {isBest ? "Best overlap" : `Alternative ${index}`}
              {isSelected && <span className="inline-flex items-center gap-1 text-accent-ink"><Check className="size-3.5" aria-hidden />Selected</span>}
            </span>
            <span className={cn("block font-semibold tracking-tight", isBest ? "text-xl sm:text-2xl" : "text-base")}>{day}</span>
            <span className="mt-1 block text-sm text-muted">{time} <span aria-hidden>·</span> {duration}</span>
          </span>
          <span className="flex shrink-0 items-center gap-4">
            <span className="text-right">
              <span className="block text-xl font-semibold tabular-nums">{range.free.length}<span className="text-sm font-normal text-muted"> / {total}</span></span>
              <span className="text-xs text-muted">{missing.length === 0 ? "everyone free" : "people free"}</span>
            </span>
            <ArrowUpRight className="size-5 text-muted" aria-hidden />
          </span>
          <span className="col-span-2 block w-full border-t border-line pt-3 text-xs leading-relaxed text-muted">
            {missing.length === 0 ? "A time for everyone. Select it to see the overlap." : `Can't make it: ${missing.map((p) => p.name).join(", ")}`}
          </span>
        </button>
        <div className="flex justify-end border-t border-line bg-subtle/40 px-3">
          <button type="button" aria-pressed={isPreview} onClick={() => onPreview(isPreview ? null : range.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent">
            <CloudSun className="size-3.5" aria-hidden />{isPreview ? "End sky preview" : "Preview the sky at this time"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="best-times-heading" className="workspace-panel rounded-3xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div><p className="moment-label mb-1">The time that brings you together</p><h2 id="best-times-heading" className="text-lg font-semibold">Best times</h2></div>
        <span className="text-xs text-muted">Based on {total} {total === 1 ? "response" : "responses"}</span>
      </div>
      {ranges.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm leading-relaxed text-muted">
          {total === 0 ? "The first response starts the picture. Share your link, or add your own availability." : "No available times yet. Mark a few slots and your best overlap will appear here."}
        </p>
      ) : (
        <>
          {candidate(ranges[0], 0)}
          {ranges.length > 1 && (
            <details className="group/alternatives mt-3">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-accent">
                See {ranges.length - 1} {ranges.length === 2 ? "alternative" : "alternatives"}<ChevronDown className="size-4 transition-transform group-open/alternatives:rotate-180" aria-hidden />
              </summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">{ranges.slice(1).map((range, i) => candidate(range, i + 1))}</div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
