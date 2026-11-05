"use client";

import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatISODate } from "@/lib/dates";
import type { ViewerGrid } from "@/lib/slots";

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const LABEL_PX = 40; // the time labels column (2.5rem)
const MIN_COLUMN_PX = 40; // narrowest day column we allow (still easy to tap)
const DAYS_PER_PAGE = 7; // when days don't all fit, page through a week at a time

/** Which day the grid starts at, shared by both grids so they page together. */
export type GridPaging = { firstColumn: number; onFirstColumnChange: (column: number) => void };

const isISODate = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);

/**
 * The shared layout for both grids (yours and the group's): day headers on
 * top, times down the side, and a body of cells drawn by `renderCell`.
 *
 * Many days: instead of scrolling sideways (hard to discover, and it fights
 * with drag-painting on phones), we show as many days as fit — at most a week —
 * with ‹ › buttons to page through. `firstColumn` is shared by both grids so
 * they page together.
 *
 * The cell body is its own element so the drag-to-paint handlers (and
 * `touch-action: none`) apply only there.
 *
 * Keyboard: the grid is a single Tab stop; arrow keys move between cells.
 * Each cell must render `data-row`, `data-col` and the given `tabIndex`.
 */
export function TimeGrid({
  grid,
  bodyProps,
  renderCell,
  firstColumn,
  onFirstColumnChange,
}: {
  grid: ViewerGrid;
  bodyProps?: ComponentProps<"div">;
  renderCell: (cell: { key: string; row: number; col: number; tabIndex: number }) => ReactNode;
  firstColumn: number;
  onFirstColumnChange: (column: number) => void;
}) {
  // How wide are we? Decides how many days fit.
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  // Nudge the "next" button until the viewer has turned a page once.
  const [hasPaged, setHasPaged] = useState(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const total = grid.columns.length;
  const fits = width === null ? total : Math.max(1, Math.floor((width - LABEL_PX) / MIN_COLUMN_PX));
  const pageSize = total <= fits ? total : Math.min(fits, DAYS_PER_PAGE);
  const start = Math.min(Math.max(0, firstColumn), total - pageSize);
  const columnIndexes = Array.from({ length: pageSize }, (_, i) => start + i);
  const columns = { gridTemplateColumns: `repeat(${pageSize}, minmax(0, 1fr))` };
  const isPaged = pageSize < total;

  // The one cell you reach with Tab: the first one on this page.
  let firstTabbable: [number, number] | null = null;
  outer: for (let r = 0; r < grid.rows.length; r++) {
    for (const c of columnIndexes) {
      if (grid.cells[r][c]) {
        firstTabbable = [r, c];
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
      if (row < 0 || row >= grid.rows.length || col < start || col >= start + pageSize) return;
      const next = e.currentTarget.querySelector<HTMLElement>(
        `[data-row="${row}"][data-col="${col}"]`,
      );
      if (next) {
        next.focus();
        return;
      }
    }
  }

  /** "5 – 11 Nov", "28 Nov – 4 Dec" or "Mon – Sun" for columns from..to. */
  function rangeLabel(from: number, to: number) {
    const a = grid.columns[from];
    const b = grid.columns[to];
    if (!isISODate(a.id)) return `${a.label} – ${b.label}`;
    const sameMonth = a.id.slice(0, 7) === b.id.slice(0, 7);
    const startText = formatISODate(a.id, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
    return `${startText} – ${formatISODate(b.id, { day: "numeric", month: "short" })}`;
  }

  const pageCount = Math.ceil(total / pageSize);
  const currentPage = start >= total - pageSize ? pageCount - 1 : Math.floor(start / pageSize);
  const nextStart = Math.min(start + pageSize, total - pageSize);
  const hasNext = start + pageSize < total;

  function turnPage(column: number) {
    setHasPaged(true);
    onFirstColumnChange(column);
  }

  return (
    <div ref={rootRef} className="min-w-0">
      {/* Paging: the next button says what's there ("12 – 18 Nov ›"), page dots
          show how many pages there are, and the button nudges twice until the
          viewer has turned a page. */}
      {isPaged && (
        <div className="mb-3 flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Previous days"
            disabled={start === 0}
            onClick={() => turnPage(Math.max(0, start - pageSize))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <p className="truncate text-sm font-medium" aria-live="polite">
              {rangeLabel(start, start + pageSize - 1)}
            </p>
            <div className="flex gap-1" aria-label={`Page ${currentPage + 1} of ${pageCount}`} role="img">
              {Array.from({ length: pageCount }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === currentPage ? "w-4 bg-accent" : "w-1.5 bg-line-strong",
                  )}
                />
              ))}
            </div>
          </div>
          {hasNext ? (
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Next days: ${rangeLabel(nextStart, nextStart + pageSize - 1)}`}
              onClick={() => turnPage(nextStart)}
              className={cn("h-8 text-accent-ink", !hasPaged && "animate-nudge")}
            >
              {rangeLabel(nextStart, nextStart + pageSize - 1)}
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button variant="secondary" size="icon" aria-label="Next days" disabled>
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-[2.5rem_1fr]">
        {/* Header row: weekday + day number. The month appears on the first
            day shown and wherever a new month starts, so labels never wrap. */}
        <div />
        <div className="grid pb-2" style={columns}>
          {columnIndexes.map((c) => {
            const column = grid.columns[c];
            const date = isISODate(column.id) ? column.id : null;
            const day = date ? Number(date.slice(8)) : null;
            const showMonth = date !== null && (c === start || day === 1);
            return (
              <div key={column.id} className="text-center leading-tight whitespace-nowrap">
                {date && (
                  <div className={cn("h-3.5 text-[10px] font-semibold text-accent-ink uppercase", !showMonth && "invisible")}>
                    {formatISODate(date, { month: "short" })}
                  </div>
                )}
                <div className="text-[11px] font-medium text-muted uppercase">{column.label}</div>
                {day !== null && <div className="text-sm font-medium tabular-nums">{day}</div>}
              </div>
            );
          })}
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
            ...columnIndexes.map((c) => {
              const key = grid.cells[r][c];
              return key ? (
                renderCell({
                  key,
                  row: r,
                  col: c,
                  tabIndex: firstTabbable && firstTabbable[0] === r && firstTabbable[1] === c ? 0 : -1,
                })
              ) : (
                <div key={`${row.time}-${grid.columns[c].id}`} className="h-7 bg-subtle sm:h-6" />
              );
            }),
          ])}
        </div>
      </div>
    </div>
  );
}
