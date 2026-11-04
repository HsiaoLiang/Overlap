"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Check, ChevronDown, Copy, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { finalStartOptions, maxLengthFrom, rangeFrom, type FinalRange } from "@/lib/final";
import { describeRange, formatDuration } from "@/lib/slots";
import { SLOT_MINUTES } from "@/lib/time";
import type { OverlapEvent } from "@/lib/types";

/**
 * Shown once to the organiser, right after the organiser link arrives: the
 * link to keep for managing the event from another device.
 */
export function OrganiserLinkNotice({ link, onDismiss }: { link: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your organiser link:", link);
    }
  }

  return (
    <section
      aria-labelledby="organiser-link-heading"
      className="animate-fade-in rounded-2xl border border-accent/40 bg-accent/[0.06] p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
          <KeyRound className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="organiser-link-heading" className="font-semibold">
            Your organiser link
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Save this to manage the event from another device. Anyone with this link can close
            or reopen the event, so keep it to yourself.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={link}
              aria-label="Organiser link"
              onFocus={(e) => e.target.select()}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-xs text-muted"
            />
            <Button variant="secondary" onClick={copy} aria-live="polite">
              {copied ? <Check className="size-4 text-accent-ink" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-mt-1 -mr-2"
        >
          <X className="size-4" />
        </Button>
      </div>
    </section>
  );
}

/**
 * Organiser only: pick any final time with a start slot and a length,
 * limited to the event's own slots.
 */
export function ChooseAnotherTime({
  event,
  viewerTimeZone,
  onPick,
  isPicking,
}: {
  event: OverlapEvent;
  viewerTimeZone: string;
  onPick: (range: FinalRange) => void;
  isPicking: boolean;
}) {
  // Start options, labelled in the viewer's timezone and grouped by day.
  const groups = useMemo(() => {
    const byDay = new Map<string, { key: string; time: string }[]>();
    for (const key of finalStartOptions(event)) {
      const { day, time } = describeRange(event, [key], viewerTimeZone);
      const options = byDay.get(day) ?? [];
      options.push({ key, time: time.slice(0, 5) }); // "19:00–19:30" → "19:00"
      byDay.set(day, options);
    }
    return [...byDay].map(([day, options]) => ({ day, options }));
  }, [event, viewerTimeZone]);

  const [start, setStart] = useState(() => groups[0].options[0].key);
  const [minutes, setMinutes] = useState(60);
  const maxMinutes = maxLengthFrom(event, start);
  const length = Math.min(minutes, maxMinutes);

  const lengths: number[] = [];
  for (let m = SLOT_MINUTES; m <= maxMinutes; m += SLOT_MINUTES) lengths.push(m);

  return (
    <details className="group rounded-2xl border border-line bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <CalendarCheck className="size-4 text-accent-ink" aria-hidden />
          Choose another time
        </span>
        <ChevronDown className="size-4 text-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field label="Start" htmlFor="final-start">
          <Select id="final-start" value={start} onChange={(e) => setStart(e.target.value)}>
            {groups.map((group) => (
              <optgroup key={group.day} label={group.day}>
                {group.options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {group.day} · {option.time}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Length" htmlFor="final-length">
          <Select
            id="final-length"
            value={length}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            {lengths.map((m) => (
              <option key={m} value={m}>
                {formatDuration(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Button onClick={() => onPick(rangeFrom(start, length))} disabled={isPicking} className="h-11">
          Pick this time
        </Button>
      </div>
    </details>
  );
}
