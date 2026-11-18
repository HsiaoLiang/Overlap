import { CreateEventForm } from "@/components/create/create-event-form";
import { RecentEvents } from "@/components/recent-events";

export default function HomePage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 px-4 pt-3 pb-16 sm:px-6 sm:pt-8 lg:grid-cols-[1fr_28rem] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:pt-16">
      <section className="lg:pt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          Find a time together.
        </h1>
        <p className="mt-2 max-w-sm text-sm text-pretty text-muted sm:text-base">
          Share a link and see when everyone is free.
        </p>
      </section>

      <section className="min-w-0 border-t border-line pt-5 sm:rounded-2xl sm:border sm:bg-surface sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <CreateEventForm />
      </section>

      <RecentEvents />
    </main>
  );
}
