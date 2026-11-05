import { calendarEntry, toICS } from "@/lib/calendar";
import { getEvent, getParticipants } from "@/lib/data";
import { finalRangeOf } from "@/lib/final";

/**
 * GET /e/<slug>/calendar.ics — the event's final time as a calendar file.
 * Opening it on an iPhone or Mac shows "Add to Calendar"; Outlook and most
 * other calendar apps can import it too.
 */
export async function GET(request: Request, ctx: RouteContext<"/e/[slug]/calendar.ics">) {
  const { slug } = await ctx.params;
  const event = await getEvent(slug);
  const range = event ? finalRangeOf(event) : null;
  if (!event || !range) {
    return new Response("This event doesn't have a final time yet.", { status: 404 });
  }

  const participants = await getParticipants(event.id);
  const eventUrl = new URL(`/e/${event.slug}`, request.url).toString();
  const ics = toICS(calendarEntry(event, range, participants, eventUrl));

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${event.slug}.ics"`,
      "Cache-Control": "no-store", // the final time can change if the organiser reopens
    },
  });
}
