/*
 * Where an event happens: an optional line of text the organiser types.
 * It can be a place ("Blue Bottle, Xinyi"), a meeting link, or both
 * ("Room 3 or https://meet.example/abc"). Links in it become clickable.
 */

export const PLACE_MAX_LENGTH = 200;

/** Tidy what the organiser typed: null when empty. */
export function normalisePlace(input: string | null | undefined): string | null {
  const text = (input ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, PLACE_MAX_LENGTH) : null;
}

/** A web link we're happy to make clickable: http(s) only, with a real host. */
function safeUrl(text: string): string | null {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname.includes(".") || url.username || url.password) return null;
  return url.href;
}

/** "meet.google.com/abc-defg-hij" → looks like a link typed without https://. */
const BARE_LINK = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:[/?#]\S*)?$/i;

export type PlacePart = { text: string; href?: string };

/**
 * Split a place into plain text and links, in order:
 *   "Room 3 or https://meet.example/abc" →
 *   [{ text: "Room 3 or " }, { text: "meet.example/abc", href: "https://meet.example/abc" }]
 */
export function placeParts(place: string): PlacePart[] {
  // A single word that looks like a domain is a link, even without https://.
  if (BARE_LINK.test(place)) {
    const href = safeUrl(`https://${place}`);
    if (href) return [{ text: place, href }];
  }

  const parts: PlacePart[] = [];
  let last = 0;
  for (const match of place.matchAll(/https?:\/\/[^\s<>"]+/gi)) {
    // Punctuation right after a link belongs to the sentence, not the link.
    const raw = match[0].replace(/[.,;:!?)\]]+$/, "");
    const href = safeUrl(raw);
    if (!href) continue;
    if (match.index > last) parts.push({ text: place.slice(last, match.index) });
    parts.push({ text: raw.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), href });
    last = match.index + raw.length;
  }
  if (last < place.length) parts.push({ text: place.slice(last) });
  return parts;
}

/** True when the place is nothing but a link (an online meeting). */
export function isOnlyLink(place: string) {
  const parts = placeParts(place);
  return parts.length === 1 && parts[0].href !== undefined;
}

/** A maps search for a place that isn't a link. */
export function mapsUrl(place: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}
