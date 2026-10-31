import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for server code only (pages, server actions).
 * Uses the secret key, which bypasses Row Level Security — so it must never
 * reach the browser. The `server-only` import makes the build fail if a
 * client component ever imports this file.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.example to .env.local and fill it in.",
    );
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
