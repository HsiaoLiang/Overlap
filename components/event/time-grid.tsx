import type { ComponentProps, KeyboardEvent, ReactNode } from "react";
import type { ViewerGrid } from "@/lib/slots";

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/**
 * The shared layout for both grids (yours and the group's): day headers on
 * top, times down the side, and a body of cells drawn by `renderCell`.
 *
 * The cell body is its own element so the drag-to-paint handlers (and
 * `touch-action: none`) apply only there — touching the headers or time
 * labels still scrolls the page normally on a phone.
 *
 * Keyboard: the grid is a single Tab stop (the first cell); arrow keys move
 * between cells. Otherwise you'd have to Tab through hundreds of cells.
 * Each cell must render `data-row`, `data-col` and the given `tabIndex`.
 */
export function TimeGrid({
  grid,
  bodyProps,
  renderCell,
}: {
  grid: ViewerGrid;
  bodyProps?: ComponentProps<"div">;
  renderCell: (cell: { key: string; row: number; col: number; tabIndex: number }) => ReactNode;
}) {
  const columnCount = grid.columns.length;
  const columns = { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` };

  // The one cell you reach with Tab.
  let firstRow = -1;
  let firstCol = -1;
  outer: for (let r = 0; r < grid.rows.length; r++) {
    for (let c = 0; c < columnCount; c++) {
      if (grid.cells[r][c]) {
        firstRow = r;
        firstCol = c;
        break outer;
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    bodyProps?.onKeyDown?.(e);
    const move = ARROWS[e.key];
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-row][data-col]");
    if (!move || !cell) return;
    e.preventDefault();

    // Step in the arrow's direction, skipping cells that aren't part of the event.
    let row = Number(cell.dataset.row);
    let col = Number(cell.dataset.col);
    while (true) {
      row += move[0];
      col += move[1];
      if (row < 0 || col < 0 || row >= grid.rows.length || col >= columnCount) return;
      const next = e.currentTarget.querySelector<HTMLElement>(
        `[data-row="${row}"][data-col="${col}"]`,
      );
      if (next) {
        next.focus();
        return;
      }
    }
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        className="grid grid-cols-[2.5rem_1fr]"
        style={{ minWidth: `calc(2.5rem + ${columnCount} * 2.5rem)` }}
      >
        {/* Header row */}
        <div />
        <div className="grid pb-2" style={columns}>
          {grid.columns.map((column) => (
            <div key={column.id} className="text-center leading-tight">
              <div className="text-[11px] font-medium text-muted uppercase">{column.label}</div>
              {column.sublabel && <div className="text-sm font-medium">{column.sublabel}</div>}
            </div>
          ))}
        </div>

        {/* Time labels — same 1px gaps and border offset as the cells, so rows line up. */}
        <div className="grid content-start gap-px py-px">
          {grid.rows.map((row) => [
            row.gapBefore && <div key={`gap-${row.time}`} className="h-3" />,
            <div
              key={row.time}
              className="h-7 pr-1.5 text-right text-[11px] leading-none text-muted tabular-nums sm:h-6"
            >
              {row.showLabel ? row.time : ""}
            </div>,
          ])}
        </div>

        {/* Cells */}
        <div
          {...bodyProps}
          onKeyDown={handleKeyDown}
          className="grid gap-px overflow-hidden rounded-md border border-line bg-line select-none"
          style={{ ...columns, ...bodyProps?.style }}
        >
          {grid.rows.map((row, r) => [
            row.gapBefore && <div key={`gap-${row.time}`} className="col-span-full h-3 bg-surface" />,
            ...grid.columns.map((column, c) => {
              const key = grid.cells[r][c];
              return key ? (
                renderCell({
                  key,
                  row: r,
                  col: c,
                  tabIndex: r === firstRow && c === firstCol ? 0 : -1,
                })
              ) : (
                <div key={`${row.time}-${column.id}`} className="h-7 bg-subtle sm:h-6" />
              );
            }),
          ])}
        </div>
      </div>
    </div>
  );
}
