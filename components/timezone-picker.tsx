"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Globe, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeZoneLabel } from "@/hooks/use-client-value";
import { cn } from "@/lib/cn";
import {
  POPULAR_TIMEZONES,
  searchTimeZones,
  timeZoneInfo,
  type TimeZoneInfo,
} from "@/lib/timezones";

type Suggestion = { id: string; note: string };
type Row = { zone: TimeZoneInfo; note?: string };

/** "14:32" in that timezone. */
function localTime(id: string, at: number) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: id,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/**
 * Timezone picker. Most people never change the detected timezone, so it's
 * shown as one line ("Taipei time (GMT+8) · Change"). Change opens a dialog
 * with suggestions and popular cities, and a search that understands cities,
 * countries, offsets ("+8"), abbreviations ("PST") and Chinese names.
 */
export function TimezonePicker({
  value,
  onChange,
  suggestions = [],
  variant = "field",
}: {
  value: string;
  onChange: (tz: string) => void;
  /** Listed first, with a note, e.g. "Your timezone". */
  suggestions?: Suggestion[];
  /** "field": a boxed row for forms. "inline": text with a Change link. */
  variant?: "field" | "inline";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [openedAt, setOpenedAt] = useState<number | null>(null);

  // Every timezone the browser knows, built when the dialog opens.
  const zones = useMemo(() => {
    if (openedAt === null) return [];
    const ids = new Set([...Intl.supportedValuesOf("timeZone"), "UTC", value]);
    return [...ids].map((id) => timeZoneInfo(id, new Date(openedAt)));
  }, [openedAt, value]);

  // Notes for suggested zones, merged when two suggestions are the same zone.
  const notes = new Map<string, string>();
  for (const s of suggestions) notes.set(s.id, notes.has(s.id) ? `${notes.get(s.id)} · ${s.note}` : s.note);

  const byId = new Map(zones.map((z) => [z.id, z]));
  const sections: { title: string; rows: Row[] }[] = query.trim()
    ? [{ title: "Results", rows: searchTimeZones(zones, query).map((zone) => ({ zone, note: notes.get(zone.id) })) }]
    : [
        {
          title: "Suggested",
          rows: [...notes].flatMap(([id, note]) => (byId.has(id) ? [{ zone: byId.get(id)!, note }] : [])),
        },
        {
          title: "Popular",
          rows: POPULAR_TIMEZONES.filter((id) => !notes.has(id) && byId.has(id)).map((id) => ({
            zone: byId.get(id)!,
          })),
        },
      ].filter((section) => section.rows.length > 0);
  const rows = sections.flatMap((section) => section.rows);

  function open() {
    setOpenedAt(Date.now());
    setQuery("");
    setActive(0);
    dialogRef.current?.showModal();
    // Phones: don't pop the keyboard straight away; the suggestions are one tap.
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }

  function choose(id: string) {
    onChange(id);
    dialogRef.current?.close();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.min(Math.max(i + (e.key === "ArrowDown" ? 1 : -1), 0), rows.length - 1));
    } else if (e.key === "Enter" && rows[active]) {
      e.preventDefault();
      choose(rows[active].zone.id);
    }
  }

  // Keep the highlighted row visible while moving with the arrow keys.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const summary = useTimeZoneLabel(value);

  return (
    <>
      {variant === "field" ? (
        <button
          type="button"
          onClick={open}
          aria-label={`Timezone: ${summary}. Change`}
          className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 text-left text-base shadow-sm transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent sm:text-sm"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Globe className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="truncate">{summary}</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-accent-ink">Change</span>
        </button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-1">
          <span className="font-medium text-ink">{summary}</span>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={open}
            className="rounded font-medium text-accent-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Change
          </button>
        </span>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${listId}-title`}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto max-h-[85dvh] w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-scrim backdrop:backdrop-blur-sm max-sm:mt-4 max-sm:mb-auto"
      >
        <div className="flex max-h-[85dvh] animate-fade-in flex-col">
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <h2 id={`${listId}-title`} className="font-semibold">
              Choose a timezone
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="-mr-2"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="relative px-4 pt-3 pb-2">
            <Search className="pointer-events-none absolute top-1/2 left-7 mt-0.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={rows[active] ? `${listId}-${rows[active].zone.id}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search a city, country or +8"
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-base shadow-sm placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none sm:text-sm"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" aria-label="Timezones" className="flex-1 overflow-y-auto px-2 pb-3">
            {rows.length === 0 && (
              <li role="presentation" className="px-3 py-8 text-center text-sm text-muted">
                No timezones match “{query.trim()}”. Try a city name or an offset like +8.
              </li>
            )}
            {sections.map((section) => [
              <li
                key={`title-${section.title}`}
                role="presentation"
                className="px-3 pt-3 pb-1 text-xs font-medium text-muted"
              >
                {section.title}
              </li>,
              ...section.rows.map(({ zone, note }) => {
                const index = rows.findIndex((r) => r.zone.id === zone.id);
                const selected = zone.id === value;
                return (
                  <li
                    key={zone.id}
                    id={`${listId}-${zone.id}`}
                    role="option"
                    aria-selected={selected}
                    data-active={index === active}
                    onClick={() => choose(zone.id)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2",
                      index === active && "bg-subtle",
                    )}
                  >
                    <Check
                      className={cn("size-4 shrink-0 text-accent-ink", !selected && "invisible")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate", selected ? "font-semibold text-accent-ink" : "font-medium")}>
                        {zone.city}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {[zone.region, note].filter(Boolean).join(" · ") || "Coordinated Universal Time"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block text-sm">{openedAt !== null && localTime(zone.id, openedAt)}</span>
                      <span className="block text-xs text-muted">{zone.offset}</span>
                    </span>
                  </li>
                );
              }),
            ])}
          </ul>
        </div>
      </dialog>
    </>
  );
}
