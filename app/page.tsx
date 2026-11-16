import { CreateEventForm } from "@/components/create/create-event-form";
import { HeroGlobe } from "@/components/home/hero-globe";
import { RecentEvents } from "@/components/recent-events";

export default function HomePage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-8 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-12 lg:pt-14">
      <section className="min-w-0">
        {/* Straight on the sky: the shade behind keeps it readable over a bright cloud. */}
        <div className="sky-shade max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-on-sky sm:text-5xl lg:text-6xl">
            Find the time that works for everyone.
          </h1>
          <p className="mt-4 max-w-md text-lg text-pretty text-on-sky-muted">
            Create an event, share the link, and watch everyone&apos;s free time overlap. No
            sign-ups, no back-and-forth.
          </p>
        </div>
        <HeroGlobe />
        <RecentEvents />
      </section>

      <section className="glass self-start rounded-3xl p-5 sm:p-6">
        <CreateEventForm />
      </section>
    </main>
  );
}
