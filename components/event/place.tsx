"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { LoaderCircle, MapPin, Pencil, Plus, Video, X } from "lucide-react";
import { updatePlace } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { isOnlyLink, mapsUrl, PLACE_MAX_LENGTH, placeParts } from "@/lib/place";

const linkClass =
  "rounded font-medium underline underline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-current";

/**
 * Where the event happens, as the organiser typed it. Links in it open in a
 * new tab; a place that isn't a link gets an "Open in Maps" next to it.
 */
export function PlaceLine({ place, className }: { place: string; className?: string }) {
  const online = isOnlyLink(place);
  const Icon = online ? Video : MapPin;

  return (
    <p className={cn("flex min-w-0 items-start gap-1.5", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">
        <span className="sr-only">{online ? "Meeting link: " : "Where: "}</span>
        {placeParts(place).map((part, i) =>
          part.href ? (
            // Typed by the organiser, so: a new tab, and no passing on of this page's address.
            <a key={i} href={part.href} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>
              {part.text}
            </a>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
        {!online && !placeParts(place).some((part) => part.href) && (
          <>
            {" "}
            <a
              href={mapsUrl(place)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={cn(linkClass, "whitespace-nowrap")}
            >
              Open in Maps
            </a>
          </>
        )}
      </span>
    </p>
  );
}

/** Organiser only: add, change or remove the place, in a small dialog. */
export function PlaceEditor({
  slug,
  token,
  place,
  onSaved,
}: {
  slug: string;
  token: string;
  place: string | null;
  onSaved: (place: string | null) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function open() {
    setDraft(place ?? "");
    setError(null);
    dialogRef.current?.showModal();
  }

  function save(next: string) {
    setError(null);
    startSaving(async () => {
      const result = await updatePlace({ slug, token, place: next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.place);
      dialogRef.current?.close();
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save(draft);
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-ink underline underline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {place ? (
          <>
            <Pencil className="size-3.5" aria-hidden /> Edit
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden /> Add a place or meeting link
          </>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="place-title"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-scrim backdrop:backdrop-blur-sm"
      >
        <form onSubmit={handleSubmit} className="animate-fade-in space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="place-title" className="font-semibold">
                Where is it?
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Everyone with the event link sees this straight away.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="-mt-1 -mr-2"
            >
              <X className="size-4" />
            </Button>
          </div>

          <Field label="Place or meeting link" htmlFor="place-input">
            <Input
              id="place-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Café name, address or meet.google.com/…"
              maxLength={PLACE_MAX_LENGTH}
              autoComplete="off"
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Save
            </Button>
            {place && (
              <Button variant="secondary" disabled={isSaving} onClick={() => save("")}>
                Remove
              </Button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
