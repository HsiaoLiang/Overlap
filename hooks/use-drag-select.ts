"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

export type GridCell = { row: number; col: number };
export type SelectMode = "add" | "remove";

type Drag = { pointerId: number; start: GridCell; end: GridCell; mode: SelectMode };

/**
 * Click-and-drag rectangle selection over a grid of cells. Used by the date
 * picker, the weekday picker and the availability grid.
 *
 * How it works:
 * - Each cell renders `data-row` / `data-col` (via `getCellProps`).
 * - Touch taps use the button's click so that a swipe can scroll the page.
 *   Touch painting can be enabled explicitly for the availability grid.
 * - On pointer down we "capture" the pointer, so we keep getting move events
 *   even when the finger leaves the starting cell. Then we look up which cell
 *   is under the pointer with `document.elementFromPoint`.
 * - The first cell decides the mode: if it was selected, the drag removes;
 *   otherwise it adds. Releasing commits the whole rectangle in one go.
 */
export function useDragSelect({
  isSelected,
  isDisabled = () => false,
  onCommit,
  touchDrag = false,
  onTouchDragEnd,
}: {
  isSelected: (cell: GridCell) => boolean;
  isDisabled?: (cell: GridCell) => boolean;
  onCommit: (cells: GridCell[], mode: SelectMode) => void;
  touchDrag?: boolean;
  onTouchDragEnd?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeDrag = useRef<Drag | null>(null);
  const pointerType = useRef("");
  const [drag, setDrag] = useState<Drag | null>(null);

  function cellAt(x: number, y: number): GridCell | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-row][data-col]");
    if (!el || !containerRef.current?.contains(el)) return null;
    return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary || e.button !== 0 || activeDrag.current) return;
    pointerType.current = e.pointerType;
    if (e.pointerType === "touch" && !touchDrag) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell || isDisabled(cell)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const selection: Drag = {
      pointerId: e.pointerId,
      start: cell,
      end: cell,
      mode: isSelected(cell) ? "remove" : "add",
    };
    activeDrag.current = selection;
    setDrag(selection);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = activeDrag.current;
    if (drag?.pointerId !== e.pointerId) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell && (cell.row !== drag.end.row || cell.col !== drag.end.col)) {
      const selection = { ...drag, end: cell };
      activeDrag.current = selection;
      setDrag(selection);
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const drag = activeDrag.current;
    if (drag?.pointerId !== e.pointerId) return;
    activeDrag.current = null;
    pointerType.current = "";
    setDrag(null);
    const cells = cellsBetween(drag.start, drag.end).filter((c) => !isDisabled(c));
    onCommit(cells, drag.mode);
    if (e.pointerType === "touch") onTouchDragEnd?.();
  }

  function cancelDrag(e: PointerEvent<HTMLDivElement>) {
    if (activeDrag.current?.pointerId !== e.pointerId) return;
    activeDrag.current = null;
    pointerType.current = "";
    setDrag(null);
    if (e.pointerType === "touch") onTouchDragEnd?.();
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
      // Keyboard and assistive technology clicks have detail 0.
      onClick: (e: MouseEvent) => {
        if ((e.detail === 0 || pointerType.current === "touch") && !isDisabled(cell)) {
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
      onPointerCancel: cancelDrag,
      onLostPointerCapture: cancelDrag,
      style: { touchAction: touchDrag ? "none" : "manipulation" },
    },
    getCellProps,
    isCellSelected,
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
