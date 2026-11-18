"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [touchDrag, setTouchDrag] = useState(false);
  const keyAt = ({ row, col }: { row: number; col: number }) => grid.cells[row]?.[col] ?? null;

  const drag = useDragSelect({
    isSelected: (cell) => selected.has(keyAt(cell) ?? ""),
    isDisabled: (cell) => keyAt(cell) === null,
    onCommit: (cells, mode) => onChange(cells.map((cell) => keyAt(cell)!), mode),
    touchDrag: touchDrag && !readOnly,
    onTouchDragEnd: () => setTouchDrag(false),
  });

  return (
    <>
      {!readOnly && (
        <div className="mb-2 hidden items-center justify-between gap-2 [@media(any-pointer:coarse)]:flex">
          <p className="text-xs text-muted" aria-live="polite">
            {touchDrag ? "Drag across slots to mark or clear them." : "Tap the times you’re free."}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className={cn("min-h-11", touchDrag && "bg-accent/10 text-accent-ink")}
            aria-pressed={touchDrag}
            onClick={() => setTouchDrag(!touchDrag)}
          >
            Drag to mark
          </Button>
        </div>
      )}
      <TimeGrid
        grid={grid}
        {...paging}
        bodyProps={readOnly ? undefined : drag.containerProps}
        renderCell={({ key, row, col, tabIndex }) => {
          const isOn = readOnly ? selected.has(key) : drag.isCellSelected({ row, col });
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
                "h-7 transition-colors duration-75 sm:h-6",
                "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent",
                isOn ? "bg-accent" : "bg-surface",
                !readOnly && !isOn && "hover:bg-accent/15",
                readOnly && "cursor-default",
              )}
            />
          );
        }}
      />
    </>
  );
}
