import Link from "next/link";
import { CalendarX2 } from "lucide-react";

export default function EventNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-subtle">
        <CalendarX2 className="size-6 text-muted" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">Event not found</h1>
      <p className="mt-2 text-sm text-muted">
        Check the link for typos — or the event may have been deleted.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
      >
        Create a new event
      </Link>
    </main>
  );
}
