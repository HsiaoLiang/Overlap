"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarCheck, Check, ChevronDown, Copy, KeyRound, Mail, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { useClientValue } from "@/hooks/use-client-value";
import { organiserLink } from "@/hooks/use-host";
import { finalStartOptions, maxLengthFrom, rangeFrom, type FinalRange } from "@/lib/final";
import { describeRange, formatDuration } from "@/lib/slots";
import { SLOT_MINUTES } from "@/lib/time";
import type { OverlapEvent } from "@/lib/types";

/**
 * The organiser link with ways to keep it somewhere safe. Browsers can forget
 * site data (iPhone Safari clears it after about 7 days without a visit), so
 * the reliable place for this link is outside the browser: LINE Keep, Notes,
 * or your own email.
 */
export function OrganiserLinkActions({ link, eventName }: { link: string; eventName: string }) {
  const [copied, setCopied] = useState(false);
  // The phone's share sheet, where available (LINE Keep, Notes, Messages…).
  const canShare = useClientValue(() => "share" in navigator) ?? false;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your organiser link:", link);
    }
  }

  async function sendToMyself() {
    try {
      await navigator.share({
        title: `Organiser link · ${eventName}`,
        text: `My organiser link for “${eventName}”. Keep it private.`,
        url: link,
      });
    } catch {
      // The share sheet was closed: nothing to do.
    }
  }

  function emailToMyself() {
    const subject = `Organiser link: ${eventName}`;
    const body = `Keep this private. It lets you manage “${eventName}” on Overlap from any device:\n\n${link}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="space-y-3">
      <input
        readOnly
        value={link}
        aria-label="Organiser link"
        onFocus={(e) => e.target.select()}
        className="h-10 w-full min-w-0 rounded-lg border border-line bg-surface px-3 font-mono text-xs text-muted"
      />
      <div className="flex flex-wrap gap-2">
        {canShare ? (
          <Button onClick={sendToMyself} className="flex-1">
            <Send className="size-4" /> Send to myself
          </Button>
        ) : (
          <Button onClick={emailToMyself} className="flex-1">
            <Mail className="size-4" /> Email it to myself
          </Button>
        )}
        <Button variant="secondary" onClick={copy} aria-live="polite" className="flex-1">
          {copied ? <Check className="size-4 text-accent-ink" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        Save it in LINE Keep, your notes or your email. Anyone with this link can manage the event,
        so don&apos;t share it with the group.
      </p>
    </div>
  );
}

/** Organiser only: a button next to Share that shows the organiser link any time. */
export function OrganiserButton({
  slug,
  token,
  eventName,
}: {
  slug: string;
  token: string;
  eventName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState("");

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setLink(organiserLink(slug, token));
          dialogRef.current?.showModal();
        }}
      >
        <KeyRound className="size-4 text-accent-ink" /> Organiser
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="organiser-title"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="animate-fade-in space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="organiser-title" className="font-semibold">
                Your organiser link
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Open it on any device to pick the final time or reopen the event.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="-mt-1 -mr-2"
            >
              <X className="size-4" />
            </Button>
          </div>
          {link && <OrganiserLinkActions link={link} eventName={eventName} />}
        </div>
      </dialog>
    </>
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
