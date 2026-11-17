import { TZDate } from "@date-fns/tz";
import { zonedParts } from "./slots";

/** A local clock reading today in a zone, converted to one shared instant. */
export function worldInstant(now: number, zone: string, minute: number | null) {
  if (minute === null) return now;
  const [y, m, d] = zonedParts(now, zone).date.split("-").map(Number);
  return new TZDate(y, m - 1, d, Math.floor(minute / 60), minute % 60, zone).getTime();
}

export function worldClock(instant: number, zone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
}

export function clockMinutes(instant: number, zone: string) {
  const [h, m] = worldClock(instant, zone).split(":").map(Number);
  return h * 60 + m;
}

export function worldDate(instant: number, zone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(instant);
}

/** A single illustration, graded continuously instead of cutting between photos. */
export function worldLight(minute: number) {
  const hour = ((minute % 1440) + 1440) % 1440 / 60;
  const stops = [
    { h: 0, top: [30, 39, 83], bottom: [99, 92, 142], light: .42, night: 1 },
    { h: 5, top: [66, 69, 119], bottom: [187, 133, 159], light: .65, night: .55 },
    { h: 7, top: [183, 191, 240], bottom: [255, 224, 195], light: 1, night: 0 },
    { h: 12, top: [152, 181, 242], bottom: [217, 221, 250], light: 1.04, night: 0 },
    { h: 17, top: [170, 172, 231], bottom: [255, 211, 173], light: 1, night: 0 },
    { h: 19, top: [116, 115, 186], bottom: [234, 169, 177], light: .9, night: .2 },
    { h: 21, top: [38, 47, 96], bottom: [120, 105, 159], light: .49, night: .9 },
    { h: 24, top: [30, 39, 83], bottom: [99, 92, 142], light: .42, night: 1 },
  ];
  const index = stops.findIndex((s, i) => i < stops.length - 1 && hour >= s.h && hour < stops[i + 1].h);
  const a = stops[Math.max(0, index)], b = stops[Math.max(0, index) + 1];
  const t = (hour - a.h) / (b.h - a.h);
  const rgb = (from: number[], to: number[]) => `rgb(${from.map((v, i) => Math.round(v + (to[i] - v) * t)).join(" ")})`;
  const night = a.night + (b.night - a.night) * t;
  return { top: rgb(a.top, b.top), bottom: rgb(a.bottom, b.bottom), brightness: a.light + (b.light - a.light) * t, night, ink: night > .45 ? "#fcfbff" : "#20305d" };
}
