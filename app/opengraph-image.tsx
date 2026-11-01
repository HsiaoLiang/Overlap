import { ImageResponse } from "next/og";
import { loadOgFonts, OG_SIZE, OgCard } from "@/lib/og";

export const alt = "Overlap — find the time that works for everyone";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview card for the home page. */
export default async function Image() {
  const title = "Find the time that works for everyone.";
  const subtitle = "Share a link. See when everyone's free.";
  return new ImageResponse(<OgCard title={title} subtitle={subtitle} />, {
    ...size,
    fonts: await loadOgFonts(`Overlap${title}${subtitle}`),
  });
}
