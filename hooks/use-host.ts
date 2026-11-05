"use client";

import { useEffect, useState } from "react";
import { verifyHost } from "@/app/actions";
import { useStoredString, writeStoredString } from "@/hooks/use-stored-string";

/*
 * Organiser ("host") identity, without accounts.
 *
 * The organiser token lives in localStorage (`overlap:<slug>:host`). It gets
 * there when you create the event, or by opening the organiser link
 * `/e/<slug>#host=<token>` on another device. The part after `#` is never
 * sent to the server, so the token stays out of server logs; we save it and
 * remove it from the address bar.
 */

const storageKey = (slug: string) => `overlap:${slug}:host`;

/** Remember that this browser organises `slug` (used right after creating it). */
export function saveHostToken(slug: string, token: string) {
  writeStoredString(storageKey(slug), token);
}

/** The private link that makes any device the organiser. */
export function organiserLink(slug: string, token: string) {
  return `${window.location.origin}/e/${slug}#host=${token}`;
}

// One server check per token, however many components ask.
const checks = new Map<string, Promise<boolean>>();
function checkToken(slug: string, token: string) {
  const key = `${slug}:${token}`;
  if (!checks.has(key)) checks.set(key, verifyHost({ slug, token }));
  return checks.get(key)!;
}

/** Is this browser the event's organiser? Returns the token once the server confirms it. */
export function useHost(slug: string) {
  const [token, setToken] = useStoredString(storageKey(slug));
  const [checked, setChecked] = useState<{ token: string; valid: boolean } | null>(null);

  // Pick up a token from the organiser link's fragment.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.hash.slice(1)).get("host");
    if (!fromUrl) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setToken(fromUrl);
  }, [setToken]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    checkToken(slug, token).then((valid) => {
      if (!cancelled) setChecked({ token, valid });
    });
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  return token && checked?.token === token && checked.valid ? token : null;
}
