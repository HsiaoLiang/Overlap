import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventHeader } from "@/components/event/event-header";
import { getEvent } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  return { title: event?.name ?? "Event not found" };
}

export default async function EventPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
      <EventHeader event={event} />

      {/* Step 2 replaces this with the join form and availability grid. */}
      <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">
        The availability grid arrives in step 2.
      </div>
    </main>
  );
}
