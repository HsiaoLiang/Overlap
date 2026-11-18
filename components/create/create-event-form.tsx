"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { createEvent } from "@/app/actions";
import { EventCreated } from "@/components/create/event-created";
import { DatePicker, MAX_DATES } from "@/components/create/date-picker";
import { TimeRangePicker } from "@/components/create/time-range-picker";
import { WeekdayPicker } from "@/components/create/weekday-picker";
import { TimezonePicker } from "@/components/timezone-picker";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import { saveHostToken } from "@/hooks/use-host";
import { rememberEvent } from "@/hooks/use-recent-events";
import { formatISODate } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/time";
import type { DateMode, Weekday } from "@/lib/types";

export function CreateEventForm() {
  const [name, setName] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("dates");
  const [dates, setDates] = useState<string[]>([]);
  const [monthOffset, setMonthOffset] = useState<number | null>(null);
  const [weekdays, setWeekdays] = useState<Weekday[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [startMinute, setStartMinute] = useState(9 * 60);
  const [endMinute, setEndMinute] = useState(21 * 60);
  const browserTimeZone = useBrowserTimeZone();
  const [chosenTimeZone, setChosenTimeZone] = useState<string | null>(null);
  const timezone = chosenTimeZone ?? browserTimeZone ?? "UTC";

  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ slug: string; name: string; hostToken: string } | null>(
    null,
  );

  const screen = created ? "created" : reviewing ? "review" : "dates";
  const previousScreen = useRef(screen);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start" });
  }, [screen]);

  const days = dateMode === "dates" ? dates : weekdays;
  const selectedLabel = dateMode === "dates" ? "date" : "day";
  const canSubmit = name.trim().length > 0 && days.length > 0 && !isPending;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!reviewing) {
      setReviewing(true);
      return;
    }

    const invalidTime = e.currentTarget.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
    if (invalidTime) {
      invalidTime.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await createEvent({ name, dateMode, days, startMinute, endMinute, timezone });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        saveHostToken(result.slug, result.hostToken);
        rememberEvent({ slug: result.slug, name: name.trim(), role: "organiser" });
        setCreated({ slug: result.slug, name: name.trim(), hostToken: result.hostToken });
      } catch {
        setError("Couldn't create the event. Please try again.");
      }
    });
  }

  if (created) return <EventCreated {...created} headingRef={headingRef} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {reviewing ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 ref={headingRef} tabIndex={-1} className="min-w-0 scroll-mt-4 text-xl font-semibold wrap-anywhere focus:outline-none">
              Review event
            </h2>
            <Button
              variant="ghost"
              className="-mr-3 min-h-11"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setReviewing(false);
              }}
            >
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Button>
          </div>
          <div className="space-y-1 border-b border-line pb-4">
            <p className="wrap-anywhere font-medium">{name.trim()}</p>
            {dateMode === "dates" ? (
              <DateSummary dates={dates} />
            ) : (
              <p className="text-sm text-muted">
                Every {WEEKDAYS.filter((day) => weekdays.includes(day.code)).map((day) => day.short).join(", ")}
              </p>
            )}
          </div>
          <div role="group" aria-labelledby="time-range-label" className="space-y-2">
            <p id="time-range-label" className="text-sm font-medium">Time range</p>
            <TimeRangePicker
              start={startMinute}
              end={endMinute}
              onChange={(start, end) => {
                setStartMinute(start);
                setEndMinute(end);
              }}
            />
          </div>
          <TimezonePicker
            value={timezone}
            onChange={setChosenTimeZone}
            suggestions={browserTimeZone ? [{ id: browserTimeZone, note: "Your timezone" }] : []}
          />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </>
      ) : (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-4 text-xl font-semibold focus:outline-none">
            Create an event
          </h2>
          <Field label="Event name" htmlFor="event-name">
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team dinner"
              maxLength={100}
              autoComplete="off"
              required
            />
          </Field>

          <div className="space-y-2">
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
              <DatePicker
                value={dates}
                onChange={setDates}
                chosenOffset={monthOffset}
                onMonthChange={setMonthOffset}
              />
            ) : (
              <WeekdayPicker value={weekdays} onChange={setWeekdays} />
            )}
          </div>
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-canvas px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0">
        <div className="flex items-center gap-3">
          {!reviewing && (
            <span className="min-w-0 flex-1 text-sm text-muted" role="status">
              {days.length > 0
                ? `${days.length} ${selectedLabel}${days.length === 1 ? "" : "s"} selected`
                : `Select ${dateMode === "dates" ? "dates" : "days"}`}
              {dateMode === "dates" && days.length === MAX_DATES && " (limit)"}
            </span>
          )}
          <Button type="submit" size="lg" disabled={!canSubmit} className={reviewing ? "w-full" : undefined}>
            {isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {isPending ? "Creating…" : reviewing ? "Create event" : "Continue"}
            {!isPending && <ArrowRight className="size-4" aria-hidden />}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DateSummary({ dates }: { dates: string[] }) {
  const format = (date: string) =>
    formatISODate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  if (dates.length < 4) {
    return <p className="text-sm text-muted">{dates.map(format).join(" · ")}</p>;
  }

  return (
    <details className="text-sm text-muted">
      <summary className="min-h-11 cursor-pointer content-center rounded focus-visible:outline-2 focus-visible:outline-accent">
        {dates.length} dates · {format(dates[0])} – {format(dates[dates.length - 1])}
      </summary>
      <ul className="mt-1 space-y-1 pl-4">
        {dates.map((date) => <li key={date}>{format(date)}</li>)}
      </ul>
    </details>
  );
}
