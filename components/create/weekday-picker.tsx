"use client";

import { Button } from "@/components/ui/button";
import { useDragSelect } from "@/hooks/use-drag-select";
import { WEEKDAYS, WEEKDAY_CODES } from "@/lib/time";
import { cn } from "@/lib/cn";
import type { Weekday } from "@/lib/types";

const PRESETS: { label: string; days: Weekday[] }[] = [
  { label: "Weekdays", days: ["mon", "tue", "wed", "thu", "fri"] },
  { label: "Weekend", days: ["sat", "sun"] },
  { label: "Every day", days: WEEKDAY_CODES },
];

/** Mon–Sun toggles. Tap one, or drag across several. */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
}) {
  const selected = new Set(value);

  const drag = useDragSelect({
    isSelected: ({ col }) => selected.has(WEEKDAYS[col].code),
    onCommit: (cells, mode) => {
      const next = new Set(value);
      for (const { col } of cells) {
        if (mode === "add") next.add(WEEKDAYS[col].code);
        else next.delete(WEEKDAYS[col].code);
      }
      onChange(WEEKDAY_CODES.filter((code) => next.has(code)));
    },
  });

  return (
    <div className="space-y-3">
      <div {...drag.containerProps} className="grid grid-cols-7 gap-1.5 select-none">
        {WEEKDAYS.map((day, col) => {
          const isOn = drag.isCellSelected({ row: 0, col });
          return (
            <button
              key={day.code}
              type="button"
              {...drag.getCellProps({ row: 0, col })}
              aria-pressed={isOn}
              aria-label={day.long}
              className={cn(
                "h-12 rounded-lg border text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                isOn
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line bg-surface text-ink hover:bg-subtle",
              )}
            >
              {day.short}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <Button key={preset.label} variant="ghost" size="sm" onClick={() => onChange(preset.days)}>
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
