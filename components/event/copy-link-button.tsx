"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/e/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked (old browsers, insecure context): fall back.
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" onClick={copy} aria-live="polite">
      {copied ? (
        <>
          <Check className="size-4 text-accent-ink" /> Copied
        </>
      ) : (
        <>
          <Link2 className="size-4" /> Copy link
        </>
      )}
    </Button>
  );
}
