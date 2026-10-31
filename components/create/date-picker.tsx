"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToday } from "@/hooks/use-client-value";
import { useDragSelect } from "@/hooks/use-drag-select";
import { addMonths, formatISODate, formatMonth, monthGrid } from "@/lib/dates";
import { cn } from "@/lib/cn";

export const MAX_DATES = 31;
const WEEKDAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Month calendar. Click a date to toggle it, or drag to select a block. */
export function DatePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (dates: string[]) => void;
}) {
  const today = useToday(); // null until we're in the browser
  const [chosenOffset, setMonthOffset] = useState<number | null>(null); // 0 = this month

  const base = today
    ? { year: Number(today.slice(0, 4)), monthIndex: Number(today.slice(5, 7)) - 1 }
    : { year: 2000, monthIndex: 0 };
  // Near the end of the month, open on next month so there's something to pick.
  const daysLeft = today
    ? new Date(Date.UTC(base.year, base.monthIndex + 1, 0)).getUTCDate() - Number(today.slice(8))
    : 0;
  const monthOffset = chosenOffset ?? (daysLeft < 7 ? 1 : 0);
  const { year, monthIndex } = addMonths(base.year, base.monthIndex, monthOffset);
  const weeks = monthGrid(year, monthIndex);
  const selected = new Set(value);

  const dateAt = ({ row, col }: { row: number; col: number }) => weeks[row]?.[col] ?? null;

  const drag = useDragSelect({
    isSelected: (cell) => selected.has(dateAt(cell) ?? ""),
    isDisabled: (cell) => {
      const date = dateAt(cell);
      return date === null || date < (today ?? "");
    },
    onCommit: (cells, mode) => {
      const next = new Set(value);
      for (const cell of cells) {
        const date = dateAt(cell)!;
        if (mode === "remove") next.delete(date);
        else if (next.size < MAX_DATES) next.add(date);
      }
      onChange([...next].sort());
    },
  });

  if (!today) {
    return <div className="h-[22rem] animate-pulse rounded-xl border border-line bg-subtle" />;
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          disabled={monthOffset <= 0}
          onClick={() => setMonthOffset(monthOffset - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-semibold" aria-live="polite">
          {formatMonth(year, monthIndex)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          disabled={monthOffset >= 12}
          onClick={() => setMonthOffset(monthOffset + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div {...drag.containerProps} className="grid grid-cols-7 gap-1 select-none">
        {weeks.map((week, row) =>
          week.map((date, col) => {
            if (!date) return <div key={`${row}-${col}`} aria-hidden />;
            const cell = { row, col };
            const isOn = drag.isCellSelected(cell);
            const isPast = date < today;
            return (
              <button
                key={date}
                type="button"
                {...drag.getCellProps(cell)}
                disabled={isPast}
                aria-pressed={isOn}
                aria-label={formatISODate(date, { weekday: "long", day: "numeric", month: "long" })}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-lg text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                  isPast && "text-muted/40",
                  !isPast && !isOn && "text-ink hover:bg-subtle",
                  isOn && "bg-accent font-medium text-on-accent",
                )}
              >
                {Number(date.slice(8))}
                {date === today && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-1 size-1 rounded-full",
                      isOn ? "bg-on-accent" : "bg-accent",
                    )}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>

      <div className="mt-3 flex min-h-8 items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-muted">
          {value.length === 0
            ? "Tap or drag to pick dates"
            : `${value.length} ${value.length === 1 ? "date" : "dates"} selected`}
        </span>
        {value.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
