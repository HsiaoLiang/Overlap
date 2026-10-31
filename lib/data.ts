import "server-only";
import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { isValidSlug } from "@/lib/slug";
import { EVENT_COLUMNS, type OverlapEvent } from "@/lib/types";

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
