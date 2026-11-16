/** A labelled, fixed-date example. It never reads or writes real event data. */
export const DEMO_DATE = "2026-11-18";
export const DEMO_PEOPLE = [
  { name: "Alex", city: "London", zone: "Europe/London", initials: "A", from: 9 * 60, to: 17 * 60 },
  { name: "Sam", city: "New York", zone: "America/New_York", initials: "S", from: 13 * 60, to: 22 * 60 },
  { name: "Yuki", city: "Taipei", zone: "Asia/Taipei", initials: "Y", from: 9 * 60, to: 14 * 60 },
] as const;
export const DEMO_START = 8 * 60;
export const DEMO_END = 18 * 60;
export const DEMO_OVERLAP = { from: 13 * 60, to: 14 * 60 };

export function demoAvailable(person: { from: number; to: number }, minute: number) {
  return minute >= person.from && minute < person.to;
}

export function demoTime(minute: number, zone: string) {
  const instant = new Date(`${DEMO_DATE}T00:00:00Z`).getTime() + minute * 60_000;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(instant);
}

export function demoMinutes(minute: number, zone: string) {
  const [hours, minutes] = demoTime(minute, zone).split(":").map(Number);
  return hours * 60 + minutes;
}

export function demoDayOffset(minute: number, zone: string) {
  const base = new Date(`${DEMO_DATE}T00:00:00Z`).getTime();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(base + minute * 60_000);
  const part = (name: string) => Number(parts.find(p => p.type === name)?.value);
  return Math.round((Date.UTC(part("year"), part("month") - 1, part("day")) - base) / 86_400_000);
}
