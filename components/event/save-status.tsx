import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { SaveStatus as Status } from "@/hooks/use-autosave";

/** A quiet "Saving… / Saved" indicator next to your grid. */
export function SaveStatus({
  status,
  error,
  onRetry,
}: {
  status: Status;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted">
      {status === "idle" && "Saves automatically"}
      {status === "saving" && (
        <>
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3.5 text-accent-ink" aria-hidden /> Saved
        </>
      )}
      {status === "error" && (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden /> {error}
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded px-2 font-medium underline focus-visible:outline-2 focus-visible:outline-danger"
          >
            Retry
          </button>
        </span>
      )}
    </span>
  );
}
