"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { anonymiseUrl } from "@/lib/analytics";

/**
 * Vercel Web Analytics: cookieless page views (no consent banner needed).
 * Every URL is cleaned first: no organiser tokens, no event links.
 * Custom events need a paid Vercel plan, so we only use page views.
 */
export function Analytics() {
  return <VercelAnalytics beforeSend={(event) => ({ ...event, url: anonymiseUrl(event.url) })} />;
}
