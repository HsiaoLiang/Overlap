import { ImageResponse } from "next/og";
import { getEvent } from "@/lib/data";
import { describeDays, describeTimes } from "@/lib/event-summary";
import { loadOgFonts, OG_SIZE, OgCard } from "@/lib/og";

export const alt = "An Overlap event — add your availability";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview card for an event link: its name, days and times. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);

  const title = event?.name ?? "Find a time that works";
  const subtitle = event
    ? `${describeDays(event)} · ${describeTimes(event)}`
    : "Share a link. See when everyone's free.";

  return new ImageResponse(<OgCard title={title} subtitle={subtitle} />, {
    ...size,
    fonts: await loadOgFonts(`Overlap${title}${subtitle}`),
  });
}
