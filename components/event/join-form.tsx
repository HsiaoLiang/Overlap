"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ChevronDown, LoaderCircle, Lock } from "lucide-react";
import { joinEvent } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { Participant } from "@/lib/types";

/** Enter your name (and optionally a PIN) to start adding availability. */
export function JoinForm({
  slug,
  onJoined,
}: {
  slug: string;
  onJoined: (participant: Participant, pin: string | undefined) => void;
}) {
  const [name, setName] = useState("");
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState("");
  // Set when the server tells us this name already exists and has a PIN.
  const [pinRequired, setPinRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showPin = usePin || pinRequired;
  const pinValid = /^\d{4}$/.test(pin);
  const canSubmit = name.trim().length > 0 && (!showPin || pinValid) && !isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const requestPin = showPin ? pin : undefined;
      try {
        const result = await joinEvent({ slug, name, pin: requestPin });
        if (result.ok) {
          onJoined(result.participant, requestPin);
          return;
        }
        if (result.needsPin) setPinRequired(true);
        setError(result.error);
      } catch {
        setError("Couldn't open your availability. Try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
      <h2 className="text-lg font-semibold">Add your availability</h2>

      <Field label="Your name" htmlFor="participant-name">
        <Input
          id="participant-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (pinRequired) setPin("");
            setPinRequired(false); // a different name may not need a PIN
            setError(null);
          }}
          placeholder="e.g. Alex"
          maxLength={40}
          autoComplete="given-name"
          readOnly={isPending}
          required
        />
      </Field>

      {!pinRequired && (
        <button
          type="button"
          aria-expanded={usePin}
          disabled={isPending}
          onClick={() => setUsePin(!usePin)}
          className="flex min-h-11 items-center gap-1.5 rounded text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronDown className={usePin ? "size-4 rotate-180" : "size-4"} aria-hidden />
          {usePin ? "Remove PIN" : "Add a PIN (optional)"}
        </button>
      )}

      {showPin && (
        <Field
          label={pinRequired ? "PIN for this name" : "Choose a 4-digit PIN"}
          htmlFor="participant-pin"
          hint={pinRequired ? undefined : "Use it to edit your answers on another device."}
        >
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              id="participant-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              className="pl-9 tracking-[0.3em]"
              autoFocus={pinRequired}
              readOnly={isPending}
              required
            />
          </div>
        </Field>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
        {isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> Opening…
          </>
        ) : (
          "Fill in your times"
        )}
      </Button>
      <p className="text-xs text-muted">Already responded? Use the same name to edit your answers.</p>
    </form>
  );
}
