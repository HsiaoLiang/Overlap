"use client";

import { useEffect, useState } from "react";
import { verifyHost } from "@/app/actions";
import { useStoredString } from "@/hooks/use-stored-string";

/**
 * Is this browser the event's organiser?
 *
 * The organiser token lives in localStorage (`overlap:<slug>:host`). It
 * arrives through the organiser link, `/e/<slug>#host=<token>`: the part
 * after `#` is never sent to the server, so the token stays out of server
 * logs. We save it, remove it from the address bar, and offer the link once
 * so the organiser can keep it for other devices.
 */
export function useHost(slug: string) {
  const [token, setToken] = useStoredString(`overlap:${slug}:host`);
  // "1" until the organiser dismisses the "save this link" notice.
  const [showLink, setShowLink] = useStoredString(`overlap:${slug}:host-link`);
  const [checked, setChecked] = useState<{ token: string; valid: boolean } | null>(null);

  // Pick up a token from the URL fragment.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.hash.slice(1)).get("host");
    if (!fromUrl) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setToken(fromUrl);
    setShowLink("1");
  }, [setToken, setShowLink]);

  // Ask the server whether the saved token is right, once per token.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyHost({ slug, token }).then((valid) => {
      if (!cancelled) setChecked({ token, valid });
    });
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  const hostToken = token && checked?.token === token && checked.valid ? token : null;

  return {
    /** The token, once the server has confirmed it. */
    hostToken,
    /** The organiser link to offer once, right after it arrives. */
    linkToSave:
      hostToken && showLink ? `${window.location.origin}/e/${slug}#host=${hostToken}` : null,
    dismissLink: () => setShowLink(null),
  };
}
