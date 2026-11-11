"use client";

import { useRef } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { useClientValue } from "@/hooks/use-client-value";
import { calendarEntry, googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar";
import type { FinalRange } from "@/lib/final";
import type { OverlapEvent, Participant } from "@/lib/types";

/**
 * "Add to calendar" for the final time: Google Calendar, Apple Calendar (an
 * .ics file, which iPhones and Macs open with "Add to Calendar") or Outlook.
 * On Apple devices, Apple Calendar is listed first.
 */
export function AddToCalendar({
  event,
  range,
  participants,
}: {
  event: OverlapEvent;
  range: FinalRange;
  participants: Participant[];
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const isApple = useClientValue(() => /iPhone|iPad|Macintosh/.test(navigator.userAgent)) ?? false;

  const entry = calendarEntry(
    event,
    range,
    participants,
    `${window.location.origin}/e/${event.slug}`,
  );
  const options = [
    { label: "Google Calendar", href: googleCalendarUrl(entry), newTab: true },
    { label: "Apple Calendar", href: `/e/${event.slug}/calendar.ics`, newTab: false },
    { label: "Outlook", href: outlookCalendarUrl(entry), newTab: true },
  ];
  if (isApple) options.unshift(options.splice(1, 1)[0]);

  return (
    <details ref={menuRef} className="group relative">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg bg-on-accent px-4 text-sm font-medium text-accent shadow-sm transition hover:bg-on-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-accent [&::-webkit-details-marker]:hidden">
        <CalendarPlus className="size-4" aria-hidden /> Add to calendar
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-52 animate-fade-in rounded-xl border border-line bg-surface p-1 text-ink shadow-xl">
        {options.map((option) => (
          <a
            key={option.label}
            href={option.href}
            target={option.newTab ? "_blank" : undefined}
            rel={option.newTab ? "noopener noreferrer" : undefined}
            onClick={() => menuRef.current?.removeAttribute("open")}
            className="block rounded-lg px-3 py-2 text-sm hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none"
          >
            {option.label}
          </a>
        ))}
      </div>
    </details>
  );
}
