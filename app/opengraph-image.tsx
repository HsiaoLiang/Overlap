import { ImageResponse } from "next/og";
import { loadOgFonts, OG_SIZE, OgCard } from "@/lib/og";

export const alt = "Overlap — find your shared moment";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview card for the home page. */
export default async function Image() {
  const title = "Find your shared moment.";
  const subtitle = "Different schedules. A little room for everyone.";
  return new ImageResponse(<OgCard title={title} subtitle={subtitle} />, {
    ...size,
    fonts: await loadOgFonts(`Overlap${title}${subtitle}`),
  });
}
