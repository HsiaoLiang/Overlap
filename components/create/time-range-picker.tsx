"use client";

import { TimeCombobox } from "@/components/create/time-combobox";
import { halfHours, minutesToLabel } from "@/lib/time";

/**
 * "From 09:00 to 21:00" in 30-minute steps. Type a time or pick one from the
 * list. Values are minutes after midnight.
 */
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
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
      <TimeCombobox
        id="start-time"
        label="Earliest time"
        value={start}
        options={halfHours(0, 1410)}
        // Keep the range valid: push the end later if needed.
        onChange={(newStart) => onChange(newStart, end > newStart ? end : Math.min(newStart + 60, 1440))}
      />
      <span className="pt-3 text-sm text-muted">to</span>
      <TimeCombobox
        id="end-time"
        label="Latest time"
        value={end}
        options={halfHours(30, 1440)}
        isDisabled={(m) => m <= start}
        disabledMessage={(m) => `${minutesToLabel(m)} is before the start time (${minutesToLabel(start)}).`}
        onChange={(newEnd) => onChange(start, newEnd)}
      />
    </div>
  );
}
