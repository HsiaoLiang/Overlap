import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const baseControl = cn(
  "w-full rounded-lg text-ink transition-colors",
  "focus:outline-none focus-visible:ring-3 focus-visible:ring-accent/20",
);

// A normal form control with a border.
const boxedControl = cn(
  baseControl,
  "h-11 border border-line bg-surface px-3 text-base shadow-sm sm:text-sm",
  "placeholder:text-muted/70 hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-accent/20",
);

/** A label + control + optional hint, stacked. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(boxedControl, className)} {...props} />;
}

/** Native <select> (great on mobile) with our styling and a chevron. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(boxedControl, "appearance-none truncate pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
