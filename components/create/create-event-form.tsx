"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createEvent } from "@/app/actions";
import { EventCreated } from "@/components/create/event-created";
import { DatePicker } from "@/components/create/date-picker";
import { TimeRangePicker } from "@/components/create/time-range-picker";
import { WeekdayPicker } from "@/components/create/weekday-picker";
import { TimezoneSelect } from "@/components/timezone-select";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import { saveHostToken } from "@/hooks/use-host";
import { rememberEvent } from "@/hooks/use-recent-events";
import type { DateMode, Weekday } from "@/lib/types";

export function CreateEventForm() {
  const [name, setName] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("dates");
  // Both selections are kept, so switching tabs doesn't lose your picks.
  const [dates, setDates] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<Weekday[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [startMinute, setStartMinute] = useState(9 * 60);
  const [endMinute, setEndMinute] = useState(21 * 60);
  // Use the browser's timezone unless the user picks another one.
  const browserTimeZone = useBrowserTimeZone();
  const [chosenTimeZone, setChosenTimeZone] = useState<string | null>(null);
  const timezone = chosenTimeZone ?? browserTimeZone ?? "UTC";

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ slug: string; name: string; hostToken: string } | null>(
    null,
  );

  // Bring the "ready" screen into view (the form above it can be long on phones).
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (created) topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [created]);

  const days = dateMode === "dates" ? dates : weekdays;
  const canSubmit = name.trim().length > 0 && days.length > 0 && !isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createEvent({ name, dateMode, days, startMinute, endMinute, timezone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // This browser is now the organiser; show both links before moving on.
      saveHostToken(result.slug, result.hostToken);
      rememberEvent({ slug: result.slug, name: name.trim(), role: "organiser" });
      setCreated({ slug: result.slug, name: name.trim(), hostToken: result.hostToken });
    });
  }

  if (created) {
    return (
      <div ref={topRef} className="scroll-mt-4">
        <EventCreated {...created} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold">New event</h2>
      <Field label="Event name" htmlFor="event-name">
        <Input
          id="event-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team dinner, Project kickoff…"
          maxLength={100}
          autoComplete="off"
          required
        />
      </Field>

      <div className="space-y-3">
        <p className="text-sm font-medium">Which days?</p>
        <SegmentedControl
          label="Which days?"
          value={dateMode}
          onChange={setDateMode}
          options={[
            { value: "dates", label: "Specific dates" },
            { value: "weekdays", label: "Days of the week" },
          ]}
        />
        {dateMode === "dates" ? (
          <DatePicker value={dates} onChange={setDates} />
        ) : (
          <WeekdayPicker value={weekdays} onChange={setWeekdays} />
        )}
      </div>

      <Field label="Between">
        <TimeRangePicker
          start={startMinute}
          end={endMinute}
          onChange={(start, end) => {
            setStartMinute(start);
            setEndMinute(end);
          }}
        />
      </Field>

      <Field
        label="Timezone"
        htmlFor="timezone"
        hint="Detected automatically. Everyone sees times in their own timezone."
      >
        <TimezoneSelect id="timezone" value={timezone} onChange={setChosenTimeZone} />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
        {isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" /> Creating…
          </>
        ) : (
          <>
            Create event <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
