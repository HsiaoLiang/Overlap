"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, KeyRound, Users } from "lucide-react";
import { OrganiserLinkActions } from "@/components/event/organiser";
import { ShareButtons } from "@/components/event/share-buttons";
import { Button } from "@/components/ui/button";
import { organiserLink } from "@/hooks/use-host";

/**
 * Shown right after creating an event: the two links, clearly apart.
 * One to share with everyone, one (the organiser link) to keep.
 */
export function EventCreated({
  slug,
  name,
  hostToken,
}: {
  slug: string;
  name: string;
  hostToken: string;
}) {
  const router = useRouter();
  const shareUrl = `${window.location.origin}/e/${slug}`;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">“{name}” is ready</h2>
          <p className="text-sm text-muted">Two links: one for everyone, one just for you.</p>
        </div>
      </div>

      {/* This screen sits inside the home page's card, so the two links are
          separated by a hairline and a tint rather than boxes of their own. */}
      <section className="space-y-3 border-t border-line pt-5">
        <h3 className="flex items-center gap-2 font-medium">
          <Users className="size-4 text-accent-ink" aria-hidden /> 1. Share with everyone
        </h3>
        <p className="text-sm text-muted">Send this to the group so they can add their times.</p>
        <p className="truncate rounded-lg bg-subtle px-3 py-2 font-mono text-xs text-muted">
          {shareUrl.replace(/^https?:\/\//, "")}
        </p>
        <ShareButtons slug={slug} eventName={name} />
      </section>

      <section className="space-y-3 rounded-xl bg-accent/[0.06] p-4">
        <h3 className="flex items-center gap-2 font-medium">
          <KeyRound className="size-4 text-accent-ink" aria-hidden /> 2. Keep this one to yourself
        </h3>
        <p className="text-sm text-muted">
          Your organiser link. Use it to pick the final time, from any device.
        </p>
        <OrganiserLinkActions link={organiserLink(slug, hostToken)} eventName={name} />
      </section>

      <Button size="lg" className="w-full" onClick={() => router.push(`/e/${slug}`)}>
        Go to your event <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
