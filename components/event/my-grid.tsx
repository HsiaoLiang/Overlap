"use client";

import { Check } from "lucide-react";
import { TimeGrid, type GridPaging } from "@/components/event/time-grid";
import { useDragSelect, type SelectMode } from "@/hooks/use-drag-select";
import { cn } from "@/lib/cn";
import type { ViewerGrid } from "@/lib/slots";

/**
 * Your own grid: click or drag to mark when you're free.
 * `readOnly` (once the event is closed) shows your answers without editing.
 */
export function MyGrid({
  grid,
  selected,
  onChange,
  readOnly = false,
  paging,
}: {
  grid: ViewerGrid;
  paging: GridPaging;
  selected: Set<string>;
  onChange: (keys: string[], mode: SelectMode) => void;
  readOnly?: boolean;
}) {
  const keyAt = ({ row, col }: { row: number; col: number }) => grid.cells[row]?.[col] ?? null;

  const drag = useDragSelect({
    isSelected: (cell) => selected.has(keyAt(cell) ?? ""),
    isDisabled: (cell) => keyAt(cell) === null,
    onCommit: (cells, mode) => onChange(cells.map((cell) => keyAt(cell)!), mode),
  });

  return (
    <TimeGrid
      grid={grid}
      {...paging}
      // Read-only: no paint handlers, so touches scroll the page as normal.
      bodyProps={readOnly ? undefined : drag.containerProps}
      renderCell={({ key, row, col, tabIndex }) => {
        const isOn = drag.isCellSelected({ row, col });
        const startsBlock = isOn && (row === 0 || grid.rows[row].gapBefore || !drag.isCellSelected({ row: row - 1, col }));
        const column = grid.columns[col];
        return (
          <button
            key={key}
            type="button"
            {...(readOnly
              ? { "data-row": row, "data-col": col, "aria-disabled": true }
              : drag.getCellProps({ row, col }))}
            tabIndex={tabIndex}
            aria-pressed={isOn}
            aria-label={`${column.label} ${column.sublabel ?? ""} ${grid.rows[row].time}`}
            className={cn(
              "flex h-7 items-center justify-center transition-colors duration-75 sm:h-6",
              "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent",
              isOn ? "bg-[var(--personal)]" : "bg-surface",
              !readOnly && !isOn && "hover:bg-[color-mix(in_oklch,var(--personal)_12%,var(--surface))]",
              readOnly && "cursor-default",
            )}
          >
            {startsBlock && <Check className="size-3 text-[var(--on-personal)]" strokeWidth={2.5} aria-hidden />}
          </button>
        );
      }}
    />
  );
}
