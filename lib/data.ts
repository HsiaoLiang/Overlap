import "server-only";
import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import {
  PARTICIPANT_ROW_COLUMNS,
  toPublicParticipant,
  type ParticipantRow,
} from "@/lib/participants";
import { isValidSlug } from "@/lib/slug";
import { EVENT_COLUMNS, type OverlapEvent, type Participant } from "@/lib/types";

/**
 * Load an event by its slug, or null if it doesn't exist.
 * Wrapped in React's `cache` so the page and its metadata share one query.
 */
export const getEvent = cache(async (slug: string): Promise<OverlapEvent | null> => {
  const normalised = slug.toLowerCase();
  if (!isValidSlug(normalised)) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("slug", normalised)
    .maybeSingle();

  if (error) throw error;
  return data as OverlapEvent | null;
});

/** Everyone who has responded to an event, oldest first, minus PIN data. */
export async function getParticipants(eventId: string): Promise<Participant[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("participants")
    .select(PARTICIPANT_ROW_COLUMNS)
    .eq("event_id", eventId)
    .order("created_at");

  if (error) throw error;
  return (data as ParticipantRow[]).map(toPublicParticipant);
}

/** An event plus its organiser-token hash. Server only — for checking tokens. */
export async function getEventWithHostHash(slug: string) {
  const normalised = slug.toLowerCase();
  if (!isValidSlug(normalised)) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(`${EVENT_COLUMNS}, host_token_hash`)
    .eq("slug", normalised)
    .maybeSingle();

  if (error) throw error;
  return data as (OverlapEvent & { host_token_hash: string | null }) | null;
}

/** When anyone last responded to an event (any participant's `updated_at`), or null. */
export async function getLastResponseAt(eventId: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("participants")
    .select("updated_at")
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.updated_at as string | undefined) ?? null;
}
