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
      {status === "saving" && (
        <>
          <LoaderCircle className="size-3.5 animate-spin" /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3.5 text-accent-ink" /> Saved
        </>
      )}
      {status === "error" && (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <CircleAlert className="size-3.5" /> {error}
          <button type="button" onClick={onRetry} className="font-medium underline">
            Retry
          </button>
        </span>
      )}
    </span>
  );
}
