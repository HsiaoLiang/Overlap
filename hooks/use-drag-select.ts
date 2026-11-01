"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

export type GridCell = { row: number; col: number };
export type SelectMode = "add" | "remove";

type Drag = { start: GridCell; end: GridCell; mode: SelectMode };

/**
 * Click-and-drag rectangle selection over a grid of cells. Used by the date
 * picker, the weekday picker and the availability grid.
 *
 * How it works:
 * - Each cell renders `data-row` / `data-col` (via `getCellProps`).
 * - Pointer Events give us one code path for mouse, touch and pen.
 * - On pointer down we "capture" the pointer, so we keep getting move events
 *   even when the finger leaves the starting cell. Then we look up which cell
 *   is under the pointer with `document.elementFromPoint`.
 * - The first cell decides the mode: if it was selected, the drag removes;
 *   otherwise it adds. Releasing commits the whole rectangle in one go.
 * - `touch-action: none` on the container stops the browser scrolling while
 *   you paint on a phone.
 */
export function useDragSelect({
  isSelected,
  isDisabled = () => false,
  onCommit,
}: {
  isSelected: (cell: GridCell) => boolean;
  isDisabled?: (cell: GridCell) => boolean;
  onCommit: (cells: GridCell[], mode: SelectMode) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  function cellAt(x: number, y: number): GridCell | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-row][data-col]");
    if (!el || !containerRef.current?.contains(el)) return null;
    return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return; // left click only
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell || isDisabled(cell)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ start: cell, end: cell, mode: isSelected(cell) ? "remove" : "add" });
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell && (cell.row !== drag.end.row || cell.col !== drag.end.col)) {
      setDrag({ ...drag, end: cell });
    }
  }

  function onPointerUp() {
    if (!drag) return;
    const cells = cellsBetween(drag.start, drag.end).filter((c) => !isDisabled(c));
    onCommit(cells, drag.mode);
    setDrag(null);
  }

  /** What a cell should look like right now, including the live drag preview. */
  function isCellSelected(cell: GridCell) {
    if (drag && isInside(cell, drag.start, drag.end) && !isDisabled(cell)) {
      return drag.mode === "add";
    }
    return isSelected(cell);
  }

  /** Props to spread on each cell (a <button>). */
  function getCellProps(cell: GridCell) {
    return {
      "data-row": cell.row,
      "data-col": cell.col,
      // Keyboard users: Enter/Space fires a click with detail 0. Mouse and touch
      // clicks (detail >= 1) are already handled by the pointer events above.
      onClick: (e: MouseEvent) => {
        if (e.detail === 0 && !isDisabled(cell)) {
          onCommit([cell], isSelected(cell) ? "remove" : "add");
        }
      },
    };
  }

  return {
    containerProps: {
      ref: containerRef,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: () => setDrag(null),
      style: { touchAction: "none" as const },
    },
    getCellProps,
    isCellSelected,
    isDragging: drag !== null,
  };
}

function isInside(cell: GridCell, a: GridCell, b: GridCell) {
  return (
    cell.row >= Math.min(a.row, b.row) &&
    cell.row <= Math.max(a.row, b.row) &&
    cell.col >= Math.min(a.col, b.col) &&
    cell.col <= Math.max(a.col, b.col)
  );
}

function cellsBetween(a: GridCell, b: GridCell) {
  const cells: GridCell[] = [];
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++) {
    for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}
