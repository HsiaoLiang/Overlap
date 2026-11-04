"use server";

import { z } from "zod";
import { getEvent, getEventWithHostHash, getParticipants } from "@/lib/data";
import { finalRangeError } from "@/lib/final";
import { createHostToken, isHostToken } from "@/lib/host";
import {
  checkPin,
  PARTICIPANT_ROW_COLUMNS,
  toPublicParticipant,
  type ParticipantRow,
} from "@/lib/participants";
import { hashPin } from "@/lib/pin";
import { slotKeys } from "@/lib/slots";
import { createServerClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slug";
import { isISODate, isValidTimeZone, WEEKDAY_CODES } from "@/lib/time";
import {
  EVENT_COLUMNS,
  type FinalState,
  type OverlapEvent,
  type Participant,
  type Weekday,
} from "@/lib/types";

/*
 * Server Actions: the only code that writes to the database.
 * They run on the server, so we validate every input here — never trust the
 * browser, even though our own form already validates.
 */

const createEventSchema = z
  .object({
    name: z.string().trim().min(1, "Give your event a name.").max(100, "That name is too long."),
    dateMode: z.enum(["dates", "weekdays"]),
    days: z.array(z.string()).min(1, "Pick at least one day.").max(31, "Pick 31 days or fewer."),
    startMinute: z.number().int().min(0).max(1410).multipleOf(30),
    endMinute: z.number().int().min(30).max(1440).multipleOf(30),
    timezone: z.string().refine(isValidTimeZone, "Unknown timezone."),
  })
  .refine((e) => e.startMinute < e.endMinute, "The end time must be after the start time.")
  .refine(
    (e) =>
      e.dateMode === "dates"
        ? e.days.every(isISODate)
        : e.days.every((d) => WEEKDAY_CODES.includes(d as Weekday)),
    "Some of the selected days aren't valid.",
  );

export type CreateEventInput = z.input<typeof createEventSchema>;

export type CreateEventResult =
  | { ok: true; slug: string; hostToken: string }
  | { ok: false; error: string };

/**
 * Create an event. Returns its slug and the organiser token. The token is
 * shown to the organiser once (in the URL fragment); we only store its hash.
 */
export async function createEvent(input: CreateEventInput): Promise<CreateEventResult> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Something's not right with the form.",
    };
  }
  const { name, dateMode, days, startMinute, endMinute, timezone } = parsed.data;

  // Store days de-duplicated and in order, so every reader can rely on that.
  const sortedDays =
    dateMode === "dates"
      ? [...new Set(days)].sort()
      : WEEKDAY_CODES.filter((code) => days.includes(code));

  const supabase = createServerClient();
  const host = createHostToken();

  // A random slug can (very rarely) collide with an existing one. The unique
  // constraint catches that (Postgres error 23505), and we just try again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug();
    const { error } = await supabase.from("events").insert({
      slug,
      name,
      date_mode: dateMode,
      days: sortedDays,
      start_minute: startMinute,
      end_minute: endMinute,
      timezone,
      host_token_hash: host.hash,
    });

    if (!error) return { ok: true, slug, hostToken: host.token };
    if (error.code !== "23505") {
      console.error("createEvent failed", error);
      break;
    }
  }

  return { ok: false, error: "We couldn't create your event. Please try again." };
}

// ---------------------------------------------------------------------------
// Joining an event

const MAX_PARTICIPANTS = 100;
const pinSchema = z.string().regex(/^\d{4}$/, "PINs are exactly 4 digits.");

const joinSchema = z.object({
  slug: z.string(),
  name: z.string().trim().min(1, "Enter your name.").max(40, "Keep your name under 40 characters."),
  pin: pinSchema.optional(),
});

export type JoinResult =
  | { ok: true; participant: Participant }
  | { ok: false; error: string; needsPin?: boolean };

/**
 * Join with a name. A new name creates a participant (with an optional PIN).
 * An existing name means "that's me": allowed straight away if it has no PIN,
 * otherwise only with the right PIN.
 */
export async function joinEvent(input: z.input<typeof joinSchema>): Promise<JoinResult> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { slug, name, pin } = parsed.data;

  const event = await getEvent(slug);
  if (!event) return { ok: false, error: "This event doesn't exist any more." };
  if (event.finalised_at) return { ok: false, error: CLOSED_MESSAGE };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("participants")
    .select(PARTICIPANT_ROW_COLUMNS)
    .eq("event_id", event.id);
  if (error) return serverError("joinEvent/select", error);

  const rows = data as ParticipantRow[];
  const existing = rows.find((r) => r.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    const check = await checkPin(supabase, existing, pin);
    if (!check.ok) return check;
    return { ok: true, participant: toPublicParticipant(existing) };
  }

  if (rows.length >= MAX_PARTICIPANTS) {
    return { ok: false, error: "This event already has the maximum number of people." };
  }

  const { data: created, error: insertError } = await supabase
    .from("participants")
    .insert({ event_id: event.id, name, pin_hash: pin ? await hashPin(pin) : null })
    .select(PARTICIPANT_ROW_COLUMNS)
    .single();

  if (insertError) {
    // 23505 = unique violation: someone took this name a moment ago.
    if (insertError.code === "23505") {
      return { ok: false, error: "Someone just joined with that name. Try again." };
    }
    return serverError("joinEvent/insert", insertError);
  }
  return { ok: true, participant: toPublicParticipant(created as ParticipantRow) };
}

// ---------------------------------------------------------------------------
// Saving availability

const saveSchema = z.object({
  participantId: z.uuid(),
  pin: pinSchema.optional(),
  slots: z.array(z.string()).max(2000),
});

export type SaveResult = { ok: true } | { ok: false; error: string; needsPin?: boolean };

export async function saveAvailability(input: z.input<typeof saveSchema>): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save: invalid data." };
  const { participantId, pin, slots } = parsed.data;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("participants")
    .select(`${PARTICIPANT_ROW_COLUMNS}, event:events(${EVENT_COLUMNS})`)
    .eq("id", participantId)
    .maybeSingle();
  if (error) return serverError("saveAvailability/select", error);
  if (!data) return { ok: false, error: "We couldn't find you in this event. Please join again." };

  const row = data as unknown as ParticipantRow & { event: OverlapEvent };
  if (row.event.finalised_at) return { ok: false, error: CLOSED_MESSAGE };

  const check = await checkPin(supabase, row, pin);
  if (!check.ok) return check;

  // Only keep keys that really belong to this event, in the event's order.
  const chosen = new Set(slots);
  const cleanSlots = slotKeys(row.event).filter((key) => chosen.has(key));

  const { error: updateError } = await supabase
    .from("participants")
    .update({ slots: cleanSlots, updated_at: new Date().toISOString() })
    .eq("id", participantId);
  if (updateError) return serverError("saveAvailability/update", updateError);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reloading (used after a realtime reconnect)

/** An event's current participants and final time, or null if it doesn't exist. */
export async function loadEventSnapshot(
  slug: string,
): Promise<{ participants: Participant[]; final: FinalState } | null> {
  const event = await getEvent(z.string().max(20).parse(slug));
  if (!event) return null;
  const { final_start, final_end, finalised_at } = event;
  return {
    participants: await getParticipants(event.id),
    final: { final_start, final_end, finalised_at },
  };
}

// ---------------------------------------------------------------------------
// Organiser: close the event with a final time, or reopen it

const CLOSED_MESSAGE = "The organiser has closed this event, so answers can't be changed.";
const NOT_ORGANISER = "Only the organiser can do that.";

const hostSchema = z.object({
  slug: z.string().max(20),
  token: z.string().min(1).max(100),
});

/** Is this the organiser's token for the event? (Used to show organiser controls.) */
export async function verifyHost(input: z.input<typeof hostSchema>): Promise<boolean> {
  const parsed = hostSchema.safeParse(input);
  if (!parsed.success) return false;
  const event = await getEventWithHostHash(parsed.data.slug);
  return isHostToken(parsed.data.token, event?.host_token_hash ?? null);
}

const finaliseSchema = hostSchema.extend({
  start: z.string().max(20),
  end: z.string().max(20),
});

export type FinaliseResult = { ok: true; final: FinalState } | { ok: false; error: string };

/** Close the event and announce the final time. */
export async function finaliseEvent(
  input: z.input<typeof finaliseSchema>,
): Promise<FinaliseResult> {
  const parsed = finaliseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That time isn't valid." };
  const { slug, token, start, end } = parsed.data;

  const event = await getEventWithHostHash(slug);
  if (!event) return { ok: false, error: "This event doesn't exist any more." };
  if (!isHostToken(token, event.host_token_hash)) return { ok: false, error: NOT_ORGANISER };

  const rangeError = finalRangeError(event, { start, end });
  if (rangeError) return { ok: false, error: rangeError };

  const final: FinalState = {
    final_start: start,
    final_end: end,
    finalised_at: new Date().toISOString(),
  };
  const { error } = await createServerClient().from("events").update(final).eq("id", event.id);
  if (error) return serverError("finaliseEvent", error);
  return { ok: true, final };
}

/** Undo finaliseEvent: open the event for answers again. */
export async function reopenEvent(input: z.input<typeof hostSchema>): Promise<FinaliseResult> {
  const parsed = hostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: NOT_ORGANISER };

  const event = await getEventWithHostHash(parsed.data.slug);
  if (!event) return { ok: false, error: "This event doesn't exist any more." };
  if (!isHostToken(parsed.data.token, event.host_token_hash)) {
    return { ok: false, error: NOT_ORGANISER };
  }

  const final: FinalState = { final_start: null, final_end: null, finalised_at: null };
  const { error } = await createServerClient().from("events").update(final).eq("id", event.id);
  if (error) return serverError("reopenEvent", error);
  return { ok: true, final };
}

function serverError(where: string, error: unknown) {
  console.error(where, error);
  return { ok: false as const, error: "Something went wrong on our side. Please try again." };
}
