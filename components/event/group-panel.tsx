"use client";

import { useMemo, useState, type MouseEvent, type PointerEvent } from "react";
import { Users, X } from "lucide-react";
import { TimeGrid } from "@/components/event/time-grid";
import { freeBySlot, heatStrength } from "@/lib/availability";
import { cn } from "@/lib/cn";
import type { ViewerGrid } from "@/lib/slots";
import { minutesToLabel } from "@/lib/time";
import type { Participant } from "@/lib/types";

/**
 * The group view: a heatmap of everyone's availability (darker = more people
 * free), details for the slot you hover or tap, and the list of respondents.
 * Tap a name to see just that person's availability.
 */
export function GroupPanel({
  grid,
  participants,
  meId,
}: {
  grid: ViewerGrid;
  participants: Participant[];
  meId: string | null;
}) {
  const free = useMemo(() => freeBySlot(participants), [participants]);
  const total = participants.length;

  // `hovered` follows the mouse; `pinned` is set by a click or tap.
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const activeKey = hovered ?? pinned;

  // Show only one person's availability when their name is selected.
  const [focusId, setFocusId] = useState<string | null>(null);
  const focused = participants.find((p) => p.id === focusId) ?? null;
  const focusedSlots = useMemo(() => new Set(focused?.slots), [focused]);

  // Where each slot key sits in the grid, for the details label.
  const positions = useMemo(() => {
    const map = new Map<string, { row: number; col: number }>();
    grid.cells.forEach((cells, row) =>
      cells.forEach((key, col) => key && map.set(key, { row, col })),
    );
    return map;
  }, [grid]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-subtle">
          <Users className="size-5 text-muted" aria-hidden />
        </div>
        <p className="font-medium">No one has responded yet</p>
        <p className="mt-1 text-sm text-muted">Share the link and the overlap will show up here.</p>
      </div>
    );
  }

  // Event delegation: one handler on the grid body instead of one per cell.
  const keyFromEvent = (e: { target: EventTarget }) =>
    (e.target as HTMLElement).closest<HTMLElement>("[data-key]")?.dataset.key ?? null;

  const bodyProps = {
    onPointerOver: (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHovered(keyFromEvent(e));
    },
    onPointerLeave: () => setHovered(null),
    onClick: (e: MouseEvent) => {
      const key = keyFromEvent(e);
      if (key) setPinned((current) => (current === key ? null : key));
    },
  };

  const position = activeKey ? positions.get(activeKey) : undefined;

  return (
    <div className="space-y-4">
      <SlotDetails
        label={position ? slotLabel(grid, position.row, position.col) : null}
        freePeople={activeKey ? (free.get(activeKey) ?? []) : []}
        participants={participants}
        meId={meId}
      />

      {focused && (
        <div className="flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-sm">
          <span>
            Showing <span className="font-medium">{focused.name}</span>&apos;s availability
          </span>
          <button
            type="button"
            onClick={() => setFocusId(null)}
            className="inline-flex items-center gap-1 font-medium text-accent-ink"
          >
            <X className="size-3.5" /> Show everyone
          </button>
        </div>
      )}

      <TimeGrid
        grid={grid}
        bodyProps={bodyProps}
        renderCell={({ key, row, col }) => {
          const count = free.get(key)?.length ?? 0;
          const strength = focused ? (focusedSlots.has(key) ? 100 : 0) : heatStrength(count, total);
          return (
            <button
              key={key}
              type="button"
              data-key={key}
              aria-label={`${slotLabel(grid, row, col)}: ${count} of ${total} free`}
              onFocus={() => setHovered(key)}
              onBlur={() => setHovered(null)}
              className={cn(
                "h-7 transition-[background-color] duration-300 sm:h-6",
                key === activeKey && "relative z-10 outline-2 -outline-offset-2 outline-ink",
              )}
              style={{
                background: strength
                  ? `color-mix(in oklch, var(--accent) ${strength}%, var(--surface))`
                  : "var(--surface)",
              }}
            />
          );
        }}
      />

      <Legend total={total} />

      <div>
        <p className="mb-2 text-xs font-medium text-muted">
          {total} {total === 1 ? "response" : "responses"} · tap a name to see their times
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {participants.map((p) => {
            const isFocused = p.id === focusId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={isFocused}
                  onClick={() => setFocusId(isFocused ? null : p.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    isFocused
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line hover:bg-subtle",
                  )}
                >
                  {p.name}
                  {p.id === meId && <span className={isFocused ? "" : "text-muted"}> (you)</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** "Tue 3 Nov · 09:00–09:30" (or "Mon · 09:00–09:30" for weekday events). */
function slotLabel(grid: ViewerGrid, row: number, col: number) {
  const column = grid.columns[col];
  const start = grid.rows[row].time;
  const [h, m] = start.split(":").map(Number);
  const end = minutesToLabel((h * 60 + m + 30) % 1440);
  const day = column.sublabel ? `${column.label} ${column.sublabel}` : column.label;
  return `${day} · ${start}–${end}`;
}

function SlotDetails({
  label,
  freePeople,
  participants,
  meId,
}: {
  label: string | null;
  freePeople: Participant[];
  participants: Participant[];
  meId: string | null;
}) {
  const freeIds = new Set(freePeople.map((p) => p.id));
  const busyPeople = participants.filter((p) => !freeIds.has(p.id));
  const name = (p: Participant) => (p.id === meId ? `${p.name} (you)` : p.name);

  return (
    <div
      aria-live="polite"
      className="sticky top-2 z-20 min-h-[5.5rem] rounded-xl border border-line bg-surface/95 p-3 text-sm shadow-sm backdrop-blur"
    >
      {label === null ? (
        <p className="flex h-full min-h-[4rem] items-center justify-center text-center text-muted">
          Hover or tap a time to see who&apos;s free.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">{label}</p>
            <p className="shrink-0 text-muted tabular-nums">
              <span className="font-semibold text-ink">{freePeople.length}</span>/
              {participants.length} free
            </p>
          </div>
          <dl className="mt-2 grid gap-1 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-accent-ink">Free</dt>
              <dd>{freePeople.length ? freePeople.map(name).join(", ") : "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted">Not free</dt>
              <dd className="text-muted">{busyPeople.length ? busyPeople.map(name).join(", ") : "—"}</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}

function Legend({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>0/{total}</span>
      <div
        aria-hidden
        className="h-2 flex-1 rounded-full border border-line"
        style={{
          background:
            "linear-gradient(to right, var(--surface), color-mix(in oklch, var(--accent) 20%, var(--surface)), var(--accent))",
        }}
      />
      <span>
        {total}/{total} free
      </span>
    </div>
  );
}
