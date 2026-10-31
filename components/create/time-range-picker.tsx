"use client";

import { Select } from "@/components/ui/field";
import { halfHours, minutesToLabel } from "@/lib/time";

/** "From 09:00 to 21:00" in 30-minute steps. Values are minutes after midnight. */
export function TimeRangePicker({
  start,
  end,
  onChange,
}: {
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Select
        aria-label="Earliest time"
        value={start}
        onChange={(e) => {
          const newStart = Number(e.target.value);
          // Keep the range valid: push the end later if needed.
          onChange(newStart, end > newStart ? end : Math.min(newStart + 60, 1440));
        }}
      >
        {halfHours(0, 1410).map((m) => (
          <option key={m} value={m}>
            {minutesToLabel(m)}
          </option>
        ))}
      </Select>
      <span className="text-sm text-muted">to</span>
      <Select
        aria-label="Latest time"
        value={end}
        onChange={(e) => onChange(start, Number(e.target.value))}
      >
        {halfHours(30, 1440).map((m) => (
          <option key={m} value={m} disabled={m <= start}>
            {minutesToLabel(m)}
          </option>
        ))}
      </Select>
    </div>
  );
}
