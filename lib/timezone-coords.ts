import { timeZoneOffsetLabel } from "./time";

/*
 * Where a timezone is on the globe (components/globe.tsx). The common zones
 * have their city's real position; any other zone is placed by its UTC offset
 * (15° of longitude per hour), which is close enough to turn the globe to the
 * right side of the world.
 */

export type Coords = { lat: number; lon: number; exact: boolean };

export const CITY_COORDS: Record<string, [lat: number, lon: number]> = {
  "Asia/Taipei": [25.03, 121.57],
  "Asia/Tokyo": [35.68, 139.69],
  "Asia/Seoul": [37.57, 126.98],
  "Asia/Hong_Kong": [22.32, 114.17],
  "Asia/Macau": [22.2, 113.54],
  "Asia/Shanghai": [31.23, 121.47],
  "Asia/Singapore": [1.35, 103.82],
  "Asia/Kuala_Lumpur": [3.14, 101.69],
  "Asia/Bangkok": [13.76, 100.5],
  "Asia/Ho_Chi_Minh": [10.82, 106.63],
  "Asia/Manila": [14.6, 120.98],
  "Asia/Jakarta": [-6.21, 106.85],
  "Asia/Kolkata": [22.57, 88.36],
  "Asia/Dubai": [25.2, 55.27],
  "Australia/Sydney": [-33.87, 151.21],
  "Australia/Melbourne": [-37.81, 144.96],
  "Pacific/Auckland": [-36.85, 174.76],
  "Europe/London": [51.51, -0.13],
  "Europe/Paris": [48.86, 2.35],
  "Europe/Berlin": [52.52, 13.41],
  "Europe/Amsterdam": [52.37, 4.9],
  "Europe/Madrid": [40.42, -3.7],
  "Europe/Rome": [41.9, 12.5],
  "Europe/Zurich": [47.37, 8.54],
  "America/New_York": [40.71, -74.01],
  "America/Chicago": [41.88, -87.63],
  "America/Denver": [39.74, -104.99],
  "America/Los_Angeles": [34.05, -118.24],
  "America/Toronto": [43.65, -79.38],
  "America/Vancouver": [49.28, -123.12],
  "America/Mexico_City": [19.43, -99.13],
  "America/Sao_Paulo": [-23.55, -46.63],
};

/** "GMT+8" → 480, "GMT-3:30" → -210, "GMT" → 0 */
export function offsetMinutes(label: string) {
  const match = /^(?:GMT|UTC)(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(label);
  if (!match || !match[1]) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

export function timeZoneCoords(id: string, now = new Date()): Coords {
  const city = CITY_COORDS[id];
  if (city) return { lat: city[0], lon: city[1], exact: true };
  // 15° per hour east of Greenwich, at a latitude most people live near.
  const lon = (offsetMinutes(timeZoneOffsetLabel(id, now)) / 60) * 15;
  return { lat: 25, lon: Math.max(-180, Math.min(180, lon)), exact: false };
}

/** The known city closest to a longitude (going round the world the short way). */
export function nearestCity(lon: number): string {
  const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  let best = "";
  let bestGap = Infinity;
  for (const [id, [, cityLon]] of Object.entries(CITY_COORDS)) {
    const gap = apart(lon, cityLon);
    if (gap < bestGap) [best, bestGap] = [id, gap];
  }
  return best;
}
