import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyPin } from "@/lib/pin";
import type { Participant } from "@/lib/types";

/** A participants row as the server sees it — includes the PIN fields. */
export type ParticipantRow = {
  id: string;
  event_id: string;
  name: string;
  slots: string[];
  pin_hash: string | null;
  pin_failures: number;
  pin_locked_until: string | null;
};

export const PARTICIPANT_ROW_COLUMNS =
  "id, event_id, name, slots, pin_hash, pin_failures, pin_locked_until";

/** Strip everything secret before a participant goes to the browser. */
export function toPublicParticipant(row: ParticipantRow): Participant {
  return { id: row.id, name: row.name, slots: row.slots, hasPin: row.pin_hash !== null };
}

const MAX_PIN_FAILURES = 5;
const LOCK_MINUTES = 15;

export type PinCheck = { ok: true } | { ok: false; error: string; needsPin: true };

/**
 * May this request act as `row`? Always yes if they have no PIN. Otherwise the
 * PIN must match, and after 5 wrong tries the name is locked for 15 minutes.
 */
export async function checkPin(
  supabase: SupabaseClient,
  row: ParticipantRow,
  pin: string | undefined,
): Promise<PinCheck> {
  if (!row.pin_hash) return { ok: true };

  const lockedUntil = row.pin_locked_until ? new Date(row.pin_locked_until) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);
    return {
      ok: false,
      needsPin: true,
      error: `Too many wrong PINs. Try again in ${minutes} min.`,
    };
  }

  if (!pin) {
    return { ok: false, needsPin: true, error: `“${row.name}” is protected. Enter the PIN.` };
  }

  if (await verifyPin(pin, row.pin_hash)) {
    if (row.pin_failures > 0 || row.pin_locked_until) {
      await supabase
        .from("participants")
        .update({ pin_failures: 0, pin_locked_until: null })
        .eq("id", row.id);
    }
    return { ok: true };
  }

  const failures = row.pin_failures + 1;
  const lock = failures >= MAX_PIN_FAILURES;
  await supabase
    .from("participants")
    .update({
      pin_failures: lock ? 0 : failures,
      pin_locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    })
    .eq("id", row.id);

  return {
    ok: false,
    needsPin: true,
    error: lock ? `Too many wrong PINs. Try again in ${LOCK_MINUTES} min.` : "Wrong PIN.",
  };
}
