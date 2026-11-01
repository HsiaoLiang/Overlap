"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Supabase client for the browser, using the publishable key. It's only used
 * to LISTEN for realtime messages — Row Level Security blocks it from reading
 * or writing any table. Returns null if the env vars are missing, in which
 * case the app still works, just without live updates.
 */
export function getBrowserClient() {
  if (client === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    client =
      url && key
        ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
        : null;
  }
  return client;
}
