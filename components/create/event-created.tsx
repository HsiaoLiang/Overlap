"use client";

import type { Ref } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, KeyRound } from "lucide-react";
import { OrganiserLinkActions } from "@/components/event/organiser";
import { ShareButtons } from "@/components/event/share-buttons";
import { organiserLink } from "@/hooks/use-host";

export function EventCreated({
  slug,
  name,
  hostToken,
  headingRef,
}: {
  slug: string;
  name: string;
  hostToken: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-4 text-xl font-semibold wrap-anywhere focus:outline-none"
        >
          “{name}” is ready
        </h2>
        <p className="mt-1 text-sm text-muted">Invite people to add their free time.</p>
      </div>

      <ShareButtons slug={slug} eventName={name} prominent />

      <Link
        href={`/e/${slug}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Go to your event <ArrowRight className="size-4" aria-hidden />
      </Link>

      <details className="group border-t border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <KeyRound className="size-4 text-muted" aria-hidden />
          Save organiser link
          <ChevronDown className="ml-auto size-4 text-muted group-open:rotate-180" aria-hidden />
        </summary>
        <OrganiserLinkActions link={organiserLink(slug, hostToken)} eventName={name} />
      </details>
    </div>
  );
}
