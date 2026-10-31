import { formatISODate } from "./dates";
import { minutesToLabel, WEEKDAYS } from "./time";
import type { OverlapEvent } from "./types";

/** "Tue 3 Nov, Wed 4 Nov" · "Tue 3 Nov – Fri 13 Nov (6 dates)" · "Weekdays" · "Mon, Wed" */
export function describeDays(event: Pick<OverlapEvent, "date_mode" | "days">) {
  const { days } = event;

  if (event.date_mode === "dates") {
    if (days.length <= 3) return days.map((d) => formatISODate(d)).join(", ");
    return `${formatISODate(days[0])} – ${formatISODate(days.at(-1)!)} (${days.length} dates)`;
  }

  const key = days.join(",");
  if (key === "mon,tue,wed,thu,fri") return "Weekdays";
  if (key === "sat,sun") return "Weekends";
  if (days.length === 7) return "Every day";
  return days.map((code) => WEEKDAYS.find((w) => w.code === code)?.short ?? code).join(", ");
}

/** "09:00 – 21:00" */
export function describeTimes(event: Pick<OverlapEvent, "start_minute" | "end_minute">) {
  return `${minutesToLabel(event.start_minute)} – ${minutesToLabel(event.end_minute)}`;
}
