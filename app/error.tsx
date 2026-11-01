"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown if something unexpected breaks while rendering a page. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-subtle">
        <TriangleAlert className="size-6 text-muted" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        It&apos;s probably temporary. Try again in a moment.
      </p>
      <Button onClick={reset} className="mt-6">
        <RotateCcw className="size-4" /> Try again
      </Button>
    </main>
  );
}
