"use client";

import { TimeGrid } from "@/components/event/time-grid";
import { useDragSelect, type SelectMode } from "@/hooks/use-drag-select";
import { cn } from "@/lib/cn";
import type { ViewerGrid } from "@/lib/slots";

/** Your own grid: click or drag to mark when you're free. */
export function MyGrid({
  grid,
  selected,
  onChange,
}: {
  grid: ViewerGrid;
  selected: Set<string>;
  onChange: (keys: string[], mode: SelectMode) => void;
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
      bodyProps={drag.containerProps}
      renderCell={({ key, row, col, tabIndex }) => {
        const isOn = drag.isCellSelected({ row, col });
        const column = grid.columns[col];
        return (
          <button
            key={key}
            type="button"
            {...drag.getCellProps({ row, col })}
            tabIndex={tabIndex}
            aria-pressed={isOn}
            aria-label={`${column.label} ${column.sublabel ?? ""} ${grid.rows[row].time}`}
            className={cn(
              "h-7 transition-colors duration-75 sm:h-6",
              "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent",
              isOn ? "bg-accent" : "bg-surface hover:bg-accent/15",
            )}
          />
        );
      }}
    />
  );
}
