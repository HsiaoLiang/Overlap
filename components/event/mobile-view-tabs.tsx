"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type MobileView = "mine" | "group";

export function MobileViewTabs({
  value,
  onChange,
  groupCount,
  saveStatus,
  isClosed,
}: {
  value: MobileView;
  onChange: (view: MobileView) => void;
  groupCount: number;
  saveStatus?: ReactNode;
  isClosed: boolean;
}) {
  const options = [
    { value: "mine" as const, label: "Your availability", controls: "your-availability-panel" },
    {
      value: "group" as const,
      label: `Group (${groupCount})`,
      controls: isClosed ? "group-availability-panel" : "group-recommendations group-availability-panel",
    },
  ];

  return (
    <div className="sticky top-0 z-20 -my-2 bg-canvas py-2 lg:hidden">
      <div role="group" aria-label="Availability view" className="grid grid-cols-2 gap-1 rounded-xl bg-subtle p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-controls={option.controls}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-lg px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent",
              value === option.value ? "bg-surface text-ink ring-1 ring-line" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {saveStatus && <div className="flex min-h-6 items-center px-1">{saveStatus}</div>}
    </div>
  );
}
