/**
 * Clean a page URL before it's sent to Vercel Web Analytics:
 * - drop the fragment (organiser links carry a secret token after "#"),
 * - drop the query string (we don't use one, so nothing is lost),
 * - replace event slugs with "[slug]", so individual event links aren't collected.
 *
 * "https://x.app/e/x7k2pq#host=abc" → "https://x.app/e/[slug]"
 */
export function anonymiseUrl(url: string) {
  const clean = new URL(url);
  clean.hash = "";
  clean.search = "";
  clean.pathname = clean.pathname.replace(/^\/e\/[^/]+/, "/e/[slug]");
  return clean.toString().replace("%5Bslug%5D", "[slug]");
}
