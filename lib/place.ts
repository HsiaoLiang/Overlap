/*
 * Where an event happens: an optional line of text the organiser types.
 * It can be a place ("Blue Bottle, Xinyi"), a meeting link, or both
 * ("Room 3 or https://meet.example/abc"). Links in it become clickable.
 */

export const PLACE_MAX_LENGTH = 2048;

/** Tidy what the organiser typed: null when empty. */
export function normalisePlace(input: string | null | undefined): string | null {
  const text = (input ?? "").replace(/\s+/g, " ").trim();
  return text || null;
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

// Sentence punctuation ends a link, including the punctuation commonly pasted
// around meeting links in Chinese messages. URL-encoded punctuation is retained.
const LINK_END = /[\s<>"，。；：！？、（）【】「」『』《》〈〉“”‘’]/u;

/** Keep balanced URL parentheses/brackets; remove only sentence delimiters. */
function trimLinkEnd(candidate: string) {
  let raw = candidate.replace(/[.,;:!?]+$/, "");
  while (raw.endsWith(")") || raw.endsWith("]")) {
    const end = raw.at(-1)!;
    const start = end === ")" ? "(" : "[";
    const opens = raw.split(start).length - 1;
    const closes = raw.split(end).length - 1;
    if (closes <= opens) break;
    raw = raw.slice(0, -1).replace(/[.,;:!?]+$/, "");
  }
  return raw;
}

export type PlacePart = { text: string; href?: string };

/**
 * Split a place into plain text and links, in order:
 *   "Room 3 or https://meet.example/abc" →
 *   [{ text: "Room 3 or " }, { text: "meet.example/abc", href: "https://meet.example/abc" }]
 */
export function placeParts(place: string): PlacePart[] {
  // Keep accepting a domain typed without https://. A following sentence
  // delimiter is plain text, rather than part of the meeting's URL.
  const bareEnd = place.search(LINK_END);
  const bareCandidate = trimLinkEnd(bareEnd === -1 ? place : place.slice(0, bareEnd));
  if (BARE_LINK.test(bareCandidate)) {
    const href = safeUrl(`https://${bareCandidate}`);
    if (href) {
      return [
        { text: bareCandidate, href },
        ...placeParts(place.slice(bareCandidate.length)),
      ];
    }
  }

  const parts: PlacePart[] = [];
  let last = 0;
  for (const match of place.matchAll(/https?:\/\/[^\s<>"，。；：！？、（）【】「」『』《》〈〉“”‘’]+/gi)) {
    // Punctuation right after a link belongs to the sentence, not the link.
    const raw = trimLinkEnd(match[0]);
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
