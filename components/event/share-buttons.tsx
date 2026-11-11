"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Link2, QrCode, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientValue } from "@/hooks/use-client-value";

/** "Copy link" plus a QR code dialog, for sharing an event. */
export function ShareButtons({ slug, eventName }: { slug: string; eventName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  const eventUrl = () => `${window.location.origin}/e/${slug}`;

  async function copy() {
    const link = eventUrl();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard can be blocked (old browsers, insecure context): fall back.
      window.prompt("Copy this link:", link);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openQr() {
    setUrl(eventUrl());
    dialogRef.current?.showModal();
  }

  // The phone's own share sheet (LINE, Messages…) where it's available.
  const canShare = useClientValue(() => "share" in navigator) ?? false;
  async function nativeShare() {
    try {
      await navigator.share({ title: eventName, text: `When are you free for “${eventName}”?`, url });
    } catch {
      // The user closed the share sheet — nothing to do.
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={copy} className="flex-1 sm:flex-none" aria-live="polite">
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
      <Button variant="secondary" onClick={openQr} aria-label="Show QR code" title="QR code">
        <QrCode className="size-4" />
      </Button>

      {/* Native <dialog>: focus trapping, Esc to close and a backdrop for free. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="share-title"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-scrim backdrop:backdrop-blur-sm"
      >
        <div className="animate-fade-in p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="share-title" className="font-semibold">
                Share this event
              </h2>
              <p className="mt-0.5 text-sm text-muted">Scan to open it on another phone.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="-mt-1 -mr-2"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* QR codes need dark-on-light to scan reliably, so the box stays light in dark mode. */}
          <div className="mx-auto mt-5 w-fit rounded-xl bg-qr-paper p-4 text-qr-ink">
            {url && (
              <QRCodeSVG value={url} size={192} level="M" fgColor="currentColor" bgColor="transparent" />
            )}
          </div>

          <p className="mt-4 truncate rounded-lg bg-subtle px-3 py-2 text-center font-mono text-xs text-muted">
            {url.replace(/^https?:\/\//, "")}
          </p>

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={copy} className="flex-1">
              {copied ? <Check className="size-4 text-accent-ink" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            {canShare && (
              <Button onClick={nativeShare} className="flex-1">
                <Share2 className="size-4" /> Share…
              </Button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
