"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { createEvent } from "@/app/actions";
import { EventCreated } from "@/components/create/event-created";
import { DatePicker } from "@/components/create/date-picker";
import { TimeRangePicker } from "@/components/create/time-range-picker";
import { WeekdayPicker } from "@/components/create/weekday-picker";
import { TimezonePicker } from "@/components/timezone-picker";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import { saveHostToken } from "@/hooks/use-host";
import { setStageTimeZone } from "@/hooks/use-stage-time-zone";
import { rememberEvent } from "@/hooks/use-recent-events";
import { PLACE_MAX_LENGTH } from "@/lib/place";
import { parseTimeInput } from "@/lib/time";
import type { DateMode, Weekday } from "@/lib/types";

type Step = 0 | 1 | 2;
const STEPS = [
  { label: "The plan", title: "What’s bringing you together?", description: "A name is all you need to start." },
  { label: "The days", title: "Make a little room.", description: "Choose the days your group could meet." },
  { label: "The time", title: "Give everyone a window.", description: "Your group will see these times in their own timezone." },
] as const;

/** The globe can suggest a timezone until someone explicitly chooses their own. */
export function CreateEventForm({ defaultTimeZone, onCreated }: { defaultTimeZone?: string; onCreated?: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("dates");
  // Keep both selections when switching modes or going back a step.
  const [dates, setDates] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<Weekday[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [startMinute, setStartMinute] = useState(9 * 60);
  const [endMinute, setEndMinute] = useState(21 * 60);
  const browserTimeZone = useBrowserTimeZone();
  const [chosenTimeZone, setChosenTimeZone] = useState<string | null>(null);
  const timezone = chosenTimeZone ?? defaultTimeZone ?? browserTimeZone ?? "UTC";

  useEffect(() => { setStageTimeZone(timezone); }, [timezone]);
  useEffect(() => () => setStageTimeZone(null), []);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ slug: string; name: string; hostToken: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const readyRef = useRef<HTMLDivElement>(null);
  const days = dateMode === "dates" ? dates : weekdays;
  const current = STEPS[step];

  useEffect(() => {
    if (!created) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    readyRef.current?.focus({ preventScroll: true });
    readyRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [created]);

  function goTo(next: Step, message: string | null = null) {
    setError(message);
    setStep(next);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    if (!name.trim()) {
      goTo(0, "Give your event a name.");
      return;
    }
    if (step === 0) {
      goTo(1);
      return;
    }
    if (days.length === 0) {
      goTo(1, "Choose at least one day for your group.");
      return;
    }
    if (step === 1) {
      goTo(2);
      return;
    }
    // Comboboxes commit text after blur. Also read it now, so an immediate
    // Create click never sends the previous time window.
    const startText = e.currentTarget.querySelector<HTMLInputElement>("#start-time")?.value;
    const endText = e.currentTarget.querySelector<HTMLInputElement>("#end-time")?.value;
    const submittedStart = startText === undefined ? startMinute : parseTimeInput(startText);
    const submittedEnd = endText === undefined ? endMinute : parseTimeInput(endText);
    if (submittedStart === null || submittedEnd === null || submittedStart > 1410 || submittedEnd < 30) {
      setError("Choose valid start and end times, such as 09:00 and 21:00.");
      return;
    }
    if (submittedStart >= submittedEnd) {
      setError("The end time needs to be after the start time.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createEvent({ name, dateMode, days, startMinute: submittedStart, endMinute: submittedEnd, timezone, place });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      saveHostToken(result.slug, result.hostToken);
      rememberEvent({ slug: result.slug, name: name.trim(), role: "organiser" });
      onCreated?.();
      setCreated({ slug: result.slug, name: name.trim(), hostToken: result.hostToken });
    });
  }

  if (created) {
    return (
      <div ref={readyRef} tabIndex={-1} className="create-wizard-ready scroll-mt-4 outline-none">
        <EventCreated {...created} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="create-wizard" aria-labelledby="create-step-title" aria-busy={isPending}>
      <ol className="create-wizard-progress" aria-label="Create event progress">
        {STEPS.map((item, index) => (
          <li key={item.label} data-state={index === step ? "current" : index < step ? "complete" : "upcoming"} aria-current={index === step ? "step" : undefined}>
            <span className="create-wizard-step-number" aria-hidden="true">{index < step ? <Check size={12} /> : `0${index + 1}`}</span>
            <span>{item.label}</span>
            <span className="sr-only">{index < step ? ", completed" : index === step ? ", current step" : ", upcoming"}</span>
          </li>
        ))}
      </ol>
      <div className="create-wizard-header">
        <span className="create-wizard-kicker">Step {step + 1} of 3</span>
        <h2 id="create-step-title" ref={headingRef} tabIndex={-1} className="outline-none">{current.title}</h2>
        <p>{current.description}</p>
      </div>

      <fieldset className="create-wizard-body min-w-0" disabled={isPending} aria-labelledby="create-step-title">
        <div className="create-wizard-step space-y-5" hidden={step !== 0} style={step !== 0 ? { display: "none" } : undefined}>
          <Field label="Event name" htmlFor="event-name">
            <Input id="event-name" value={name} onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Dinner together, a catch-up, a new idea…" maxLength={100} autoComplete="off" required />
          </Field>
          <details className="create-optional">
            <summary>Add a place or meeting link <span>{place.trim() ? "Added" : "Optional"}</span></summary>
            <div className="pt-4">
              <Field label="Where?" htmlFor="event-place" hint="You can add or change this later.">
                <Input id="event-place" value={place} onChange={(e) => setPlace(e.target.value)}
                  placeholder="Café name, address or meeting link" maxLength={PLACE_MAX_LENGTH} autoComplete="off" />
              </Field>
            </div>
          </details>
        </div>
        <div className="create-wizard-step space-y-5" hidden={step !== 1} style={step !== 1 ? { display: "none" } : undefined}>
          <SegmentedControl label="Which days?" value={dateMode} onChange={(mode) => { setDateMode(mode); setError(null); }} options={[
            { value: "dates", label: "Specific dates" },
            { value: "weekdays", label: "Days of the week" },
          ]} />
          {dateMode === "dates" ? <DatePicker value={dates} onChange={(value) => { setDates(value); setError(null); }} />
            : <WeekdayPicker value={weekdays} onChange={(value) => { setWeekdays(value); setError(null); }} />}
        </div>
        <div className="create-wizard-step space-y-5" hidden={step !== 2} style={step !== 2 ? { display: "none" } : undefined}>
          <p className="create-wizard-summary"><strong>{name.trim()}</strong><span>{days.length} {dateMode === "dates" ? (days.length === 1 ? "date" : "dates") : (days.length === 1 ? "day each week" : "days each week")}</span></p>
          <Field label="Between" hint="Pick a window. Everyone will mark the times that work for them.">
            <TimeRangePicker start={startMinute} end={endMinute} onChange={(start, end) => { setStartMinute(start); setEndMinute(end); }} />
          </Field>
          <Field label="Timezone" hint="The times above are in this timezone.">
            <TimezonePicker value={timezone} onChange={setChosenTimeZone} suggestions={[
              ...(browserTimeZone ? [{ id: browserTimeZone, note: "Your timezone" }] : []),
              ...(defaultTimeZone && defaultTimeZone !== browserTimeZone ? [{ id: defaultTimeZone, note: "Globe selection" }] : []),
            ]} />
          </Field>
        </div>
      </fieldset>
      {error && <p role="alert" className="create-wizard-error rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="create-wizard-actions">
        {step > 0 && <Button variant="ghost" onClick={() => goTo((step - 1) as Step)} disabled={isPending} className="create-wizard-back"><ArrowLeft size={16} aria-hidden="true" />Back</Button>}
        <Button type="submit" size="lg" className="create-wizard-next" disabled={isPending}>
          {isPending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Creating…</>
            : <>{step === 0 ? "Choose the days" : step === 1 ? "Set the time" : "Create & get your link"}<ArrowRight size={17} aria-hidden="true" /></>}
        </Button>
      </div>
      <p className="create-wizard-reassurance">{step === 2 ? "No account needed. You’ll get a link to share." : "Your choices stay here as you go back and forth."}</p>
    </form>
  );
}
