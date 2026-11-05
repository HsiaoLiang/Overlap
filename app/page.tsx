import { CreateEventForm } from "@/components/create/create-event-form";

export default function HomePage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1fr_28rem] lg:gap-16 lg:pt-16">
      <section className="lg:pt-8">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Find the time that works for everyone.
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted text-pretty">
          Create an event, share the link, and watch everyone&apos;s free time overlap. No
          sign-ups, no back-and-forth.
        </p>
        <HeatmapIllustration />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <CreateEventForm />
      </section>
    </main>
  );
}

/** A small decorative heatmap so the hero shows what the product does. */
function HeatmapIllustration() {
  // Fixed values (0–4 people free) so it renders the same every time.
  const rows = [
    [0, 1, 1, 0, 2],
    [1, 2, 3, 1, 2],
    [2, 4, 4, 2, 3],
    [1, 3, 4, 3, 1],
    [0, 1, 2, 2, 0],
  ];
  return (
    <div aria-hidden className="mt-10 hidden max-w-xs gap-1.5 lg:grid lg:grid-cols-5">
      {rows.flat().map((count, i) => (
        <div
          key={i}
          className="aspect-[2/1] rounded-md"
          style={{
            background: `color-mix(in oklch, var(--heat) ${count * 25}%, var(--subtle))`,
          }}
        />
      ))}
    </div>
  );
}
