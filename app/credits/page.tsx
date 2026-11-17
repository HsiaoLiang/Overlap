import type { Metadata } from "next";
import { LICENCE_URLS, SKY_CREDITS } from "@/lib/sky-credits";

export const metadata: Metadata = { title: "Visual credits" };

const linkClass =
  "rounded font-medium text-ink underline underline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-accent";

/** Artwork provenance and the original photo studies retained in the source. */
export default function CreditsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-16 sm:px-6">
      <div className="glass rounded-3xl p-5 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">A sky of our own.</h1>
        <p className="mt-2 text-sm text-pretty text-muted">
          Overlap&apos;s cloud world is one illustration, made for this project with OpenAI&apos;s image tools.
          Its clouds stay in place as the light moves from dawn to midnight, so every hour belongs to the same little world.
        </p>
        <h2 className="mt-8 text-lg font-semibold">Earlier photo studies</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">The original sky experiments used these photographs from Wikimedia Commons. Their cropped source assets remain in this repository under the same licences as the originals.</p>

        <ul className="mt-6 divide-y divide-ink/10">
          {SKY_CREDITS.map((photo) => (
            <li key={photo.part} className="py-4 first:pt-0 last:pb-0">
              <p className="text-xs font-medium text-muted">{photo.part}</p>
              <p className="mt-1">
                <a href={photo.source} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {photo.title}
                </a>
              </p>
              <p className="mt-1 text-sm text-muted">
                By {photo.author}, licensed under{" "}
                <a
                  href={LICENCE_URLS[photo.licence]}
                  target="_blank"
                  rel="noopener noreferrer license"
                  className={linkClass}
                >
                  {photo.licence}
                </a>
                .
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
