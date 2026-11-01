import type { ComponentProps, ReactNode } from "react";
import type { ViewerGrid } from "@/lib/slots";

/**
 * The shared layout for both grids (yours and the group's): day headers on
 * top, times down the side, and a body of cells drawn by `renderCell`.
 *
 * The cell body is its own element so the drag-to-paint handlers (and
 * `touch-action: none`) apply only there — touching the headers or time
 * labels still scrolls the page normally on a phone.
 */
export function TimeGrid({
  grid,
  bodyProps,
  renderCell,
}: {
  grid: ViewerGrid;
  bodyProps?: ComponentProps<"div">;
  renderCell: (cell: { key: string; row: number; col: number }) => ReactNode;
}) {
  const columnCount = grid.columns.length;
  const columns = { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` };

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
          className="grid gap-px overflow-hidden rounded-md border border-line bg-line select-none"
          style={{ ...columns, ...bodyProps?.style }}
        >
          {grid.rows.map((row, r) => [
            row.gapBefore && <div key={`gap-${row.time}`} className="col-span-full h-3 bg-surface" />,
            ...grid.columns.map((column, c) => {
              const key = grid.cells[r][c];
              return key ? (
                renderCell({ key, row: r, col: c })
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
