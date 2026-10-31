import Link from "next/link";

/** Two overlapping circles — the overlap is where everyone's free. */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="12" cy="16" r="9" fill="var(--accent)" opacity="0.35" />
      <circle cx="20" cy="16" r="9" fill="var(--accent)" opacity="0.35" />
      <path d="M16 8.5a9 9 0 0 1 0 15a9 9 0 0 1 0-15z" fill="var(--accent)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-accent"
    >
      <LogoMark />
      Overlap
    </Link>
  );
}
