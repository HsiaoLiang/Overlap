"use client";

import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
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
 * with a tab for each week. `firstColumn` is shared by both grids so
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
  const tabsRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const total = grid.columns.length;
  // Width 0 means hidden (the other tab on phones): treat it as not measured yet.
  const fits = !width ? total : Math.max(1, Math.floor((width - LABEL_PX) / MIN_COLUMN_PX));
  const pageSize = total <= fits ? total : Math.min(fits, DAYS_PER_PAGE);
  const isPaged = pageSize < total;

  // Pages are fixed chunks of `pageSize` days (a week, normally); the last may be shorter.
  const pageCount = Math.ceil(total / pageSize);
  const currentPage = Math.min(Math.max(0, Math.floor(firstColumn / pageSize)), pageCount - 1);
  const start = currentPage * pageSize;
  const visibleCount = Math.min(pageSize, total - start);
  const columnIndexes = Array.from({ length: visibleCount }, (_, i) => start + i);
  // A shorter last page keeps the same column width as the others.
  const columns = {
    gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))`,
    width: `${(visibleCount / pageSize) * 100}%`,
  };

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
      if (row < 0 || row >= grid.rows.length || col < start || col >= start + visibleCount) return;
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
    if (!isISODate(a.id)) return from === to ? a.label : `${a.label} – ${b.label}`;
    const end = formatISODate(b.id, { day: "numeric", month: "short" });
    if (from === to) return end;
    const sameMonth = a.id.slice(0, 7) === b.id.slice(0, 7);
    return `${formatISODate(a.id, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })} – ${end}`;
  }

  const pages = Array.from({ length: pageCount }, (_, i) => {
    const from = i * pageSize;
    const to = Math.min(from + pageSize, total) - 1;
    return { from, to, days: to - from + 1, range: rangeLabel(from, to) };
  });
  // Call the tabs "Week 1, Week 2…" only when each really is at most a week of dates.
  const isWeekly =
    pageSize === DAYS_PER_PAGE &&
    pages.every(({ from, to }) => {
      const a = grid.columns[from].id;
      const b = grid.columns[to].id;
      return isISODate(a) && isISODate(b) && Date.parse(b) - Date.parse(a) <= 6 * 86_400_000;
    });

  // Keep the selected tab in view when the tab row scrolls (many weeks on a phone).
  useEffect(() => {
    const row = tabsRef.current;
    const tab = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (row && tab) row.scrollLeft = tab.offsetLeft - (row.clientWidth - tab.clientWidth) / 2;
  }, [currentPage, isPaged]);

  return (
    <div ref={rootRef} className="min-w-0">
      {/* Many days: one tab per week, so it's obvious how many there are and
          which one you're looking at. Both grids share the selection. */}
      {isPaged && (
        <div className="mb-3">
          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Days to show"
            className="flex gap-1 overflow-x-auto rounded-xl bg-subtle p-1 [scrollbar-width:none]"
          >
            {pages.map((page, i) => {
              const selected = i === currentPage;
              const [main, sub] = isWeekly
                ? [`Week ${i + 1}`, page.range]
                : [page.range, `${page.days} ${page.days === 1 ? "day" : "days"}`];
              return (
                <button
                  key={page.from}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onFirstColumnChange(page.from)}
                  className={cn(
                    "min-w-[7.5rem] flex-1 shrink-0 rounded-lg px-3 py-1.5 text-center transition-[color,background-color]",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    selected
                      ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                      : "text-muted hover:text-ink",
                  )}
                >
                  <span className="block text-sm font-medium whitespace-nowrap">{main}</span>
                  <span className="block text-xs whitespace-nowrap">{sub}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-muted" aria-live="polite">
            This event has {total} days · showing{" "}
            {isWeekly ? `week ${currentPage + 1}` : pages[currentPage].range}
          </p>
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
