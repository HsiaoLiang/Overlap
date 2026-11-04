import { CalendarCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attendance, describeFinal, type FinalRange } from "@/lib/final";
import type { OverlapEvent, Participant } from "@/lib/types";

/**
 * Shown to everyone once the organiser has picked the final time: when it is
 * (in the viewer's timezone), who's free and who can't make it.
 */
export function FinalBanner({
  event,
  range,
  participants,
  meId,
  viewerTimeZone,
  onReopen,
  isBusy = false,
}: {
  event: OverlapEvent;
  range: FinalRange;
  participants: Participant[];
  meId: string | null;
  viewerTimeZone: string;
  /** Organiser only. */
  onReopen?: () => void;
  isBusy?: boolean;
}) {
  const { day, time, duration } = describeFinal(event, range, viewerTimeZone);
  const { free, cantMake } = attendance(range, participants);
  const names = (people: Participant[]) =>
    people.map((p) => (p.id === meId ? `${p.name} (you)` : p.name)).join(", ") || "—";

  return (
    <section
      aria-labelledby="final-heading"
      aria-live="polite"
      className="animate-fade-in rounded-2xl border border-accent/40 bg-accent/[0.06] p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
            <CalendarCheck className="size-5" aria-hidden />
          </div>
          <div>
            <h2 id="final-heading" className="text-xs font-medium tracking-wide text-accent-ink uppercase">
              Final time
            </h2>
            <p className="mt-0.5 text-xl font-semibold">
              {day} · {time}
            </p>
            <p className="text-sm text-muted">
              {duration} · {viewerTimeZone.replaceAll("_", " ")} time
            </p>
          </div>
        </div>
        {onReopen && (
          <Button variant="secondary" size="sm" onClick={onReopen} disabled={isBusy}>
            <RotateCcw className="size-4" /> Reopen event
          </Button>
        )}
      </div>

      <dl className="mt-4 grid gap-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 font-medium text-accent-ink">Free ({free.length})</dt>
          <dd>{names(free)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted">Can&apos;t make it ({cantMake.length})</dt>
          <dd className="text-muted">{names(cantMake)}</dd>
        </div>
      </dl>
    </section>
  );
}
