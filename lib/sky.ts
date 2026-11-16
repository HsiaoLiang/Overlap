/*
 * The colour of the sky at a time of day. The page background is a soft
 * top-to-bottom gradient of these two colours (see components/sky.tsx), so you
 * can read the hour from it: blue by day, orange around sunrise and sunset,
 * near-black at night.
 */

export type SkyColours = { top: string; bottom: string };

type LCH = [lightness: number, chroma: number, hue: number];
type Stop = { at: number; top: LCH; bottom: LCH };

const DAY = 1440;

const at = (h: number, m = 0) => h * 60 + m;

/** The sky through one day (OKLCH). Midnight is the first stop and wraps around. */
const STOPS: Stop[] = [
  { at: at(0), top: [0.1, 0.05, 265], bottom: [0.17, 0.065, 268] }, // night
  { at: at(4, 30), top: [0.12, 0.055, 265], bottom: [0.21, 0.07, 278] },
  { at: at(5, 45), top: [0.36, 0.09, 265], bottom: [0.68, 0.16, 50] }, // first light
  { at: at(6, 45), top: [0.62, 0.11, 245], bottom: [0.83, 0.14, 68] }, // sunrise
  { at: at(9), top: [0.64, 0.15, 248], bottom: [0.84, 0.08, 232] }, // day
  { at: at(16), top: [0.64, 0.15, 248], bottom: [0.84, 0.08, 232] },
  { at: at(17, 30), top: [0.56, 0.12, 258], bottom: [0.8, 0.15, 65] }, // golden hour
  { at: at(18, 30), top: [0.38, 0.1, 278], bottom: [0.68, 0.18, 45] }, // sunset
  { at: at(19, 30), top: [0.2, 0.06, 278], bottom: [0.34, 0.1, 330] }, // dusk
  { at: at(20, 30), top: [0.11, 0.05, 265], bottom: [0.18, 0.065, 268] }, // night
];

/** OKLCH → OKLab, so colours blend in a straight line (no trip round the hue wheel). */
function toLab([l, c, h]: LCH): [number, number, number] {
  const radians = (h * Math.PI) / 180;
  return [l, c * Math.cos(radians), c * Math.sin(radians)];
}

function mix(a: LCH, b: LCH, t: number) {
  const from = toLab(a);
  const to = toLab(b);
  const [l, aa, bb] = from.map((v, i) => v + (to[i] - v) * t);
  return `oklab(${l.toFixed(3)} ${aa.toFixed(3)} ${bb.toFixed(3)})`;
}

/** "19:30" → 1170 */
export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** The sky's two colours at `minutes` after midnight (any number: it wraps). */
export function skyAt(minutes: number): SkyColours {
  const minute = ((minutes % DAY) + DAY) % DAY;
  // The stop at or before this minute, and the one after (midnight again at the end).
  let i = STOPS.length - 1;
  while (i > 0 && STOPS[i].at > minute) i--;
  const from = STOPS[i];
  const to = STOPS[i + 1] ?? { ...STOPS[0], at: DAY };
  const t = (minute - from.at) / (to.at - from.at);
  return { top: mix(from.top, to.top, t), bottom: mix(from.bottom, to.bottom, t) };
}
