import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventHeader } from "@/components/event/event-header";
import { EventView } from "@/components/event/event-view";
import { getEvent, getParticipants } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  return { title: event?.name ?? "Event not found" };
}

export default async function EventPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const participants = await getParticipants(event.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
      <EventHeader event={event} />
      <EventView event={event} initialParticipants={participants} />
    </main>
  );
}
