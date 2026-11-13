import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventView } from "@/components/event/event-view";
import { getEvent, getLastResponseAt, getParticipants } from "@/lib/data";
import { deleteAfterDate } from "@/lib/retention";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  return { title: event?.name ?? "Event not found" };
}

export default async function EventPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const [participants, lastResponseAt] = await Promise.all([
    getParticipants(event.id),
    event.date_mode === "weekdays" ? getLastResponseAt(event.id) : null,
  ]);
  const deleteAfter = deleteAfterDate(event, lastResponseAt);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
      <EventView
        event={event}
        initialParticipants={participants}
        deleteAfter={deleteAfter}
      />
    </main>
  );
}
