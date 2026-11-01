import Link from "next/link";
import { Compass } from "lucide-react";

/** Any URL that doesn't match a page. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-subtle">
        <Compass className="size-6 text-muted" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">There&apos;s nothing at this address.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
      >
        Create an event
      </Link>
    </main>
  );
}
