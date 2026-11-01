"use client";

import { useState, useTransition, type FormEvent } from "react";
import { LoaderCircle, Lock } from "lucide-react";
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
    setError(null);
    startTransition(async () => {
      const result = await joinEvent({ slug, name, pin: showPin ? pin : undefined });
      if (result.ok) {
        onJoined(result.participant, showPin ? pin : undefined);
        return;
      }
      if (result.needsPin) setPinRequired(true);
      setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-5 py-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Add your availability</h2>
        <p className="mt-1 text-sm text-muted">
          Already responded? Use the same name to edit your answers.
        </p>
      </div>

      <Field label="Your name" htmlFor="participant-name">
        <Input
          id="participant-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setPinRequired(false); // a different name may not need a PIN
            setError(null);
          }}
          placeholder="e.g. Alex"
          maxLength={40}
          autoComplete="given-name"
          required
        />
      </Field>

      {!pinRequired && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={usePin}
            onChange={(e) => setUsePin(e.target.checked)}
            className="size-4 accent-accent"
          />
          <span>
            Protect my answers with a PIN <span className="text-muted">(optional)</span>
          </span>
        </label>
      )}

      {showPin && (
        <Field
          label={pinRequired ? "PIN for this name" : "Choose a 4-digit PIN"}
          htmlFor="participant-pin"
          hint={pinRequired ? undefined : "You'll need it to edit your answers on another device."}
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="participant-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              className="pl-9 tracking-[0.3em]"
              autoFocus={pinRequired}
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

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : "Continue"}
      </Button>
    </form>
  );
}
