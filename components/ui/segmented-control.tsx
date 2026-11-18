"use client";

import { cn } from "@/lib/cn";

const ARROWS: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

/** A pill-shaped "pick one" control, e.g. Specific dates | Days of the week. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-subtle p-1"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const direction = ARROWS[event.key];
              if (!direction) return;
              event.preventDefault();
              const next = (index + direction + options.length) % options.length;
              event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
              onChange(options[next].value);
            }}
            className={cn(
              "min-h-11 rounded-lg px-2 text-sm font-medium transition-[color,background-color] sm:min-h-9 sm:px-3",
              "focus-visible:outline-2 focus-visible:outline-accent",
              selected
                ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
