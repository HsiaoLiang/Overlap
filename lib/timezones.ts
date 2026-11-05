import { timeZoneCity, timeZoneOffsetLabel } from "./time";

/*
 * Finding a timezone without scrolling through 400 options: city names
 * instead of IDs, a short list of suggestions, and search by city, country,
 * offset ("+8", "GMT+8"), common abbreviations ("PST") or Chinese names.
 */

/** Extra words people search with, for the most common timezones. */
const ALIASES: Record<string, string[]> = {
  "Asia/Taipei": ["Taiwan", "台北", "臺北", "台灣", "臺灣", "Taichung", "Kaohsiung", "台中", "高雄"],
  "Asia/Tokyo": ["Japan", "日本", "東京", "Osaka", "大阪", "JST"],
  "Asia/Seoul": ["Korea", "South Korea", "韓國", "首爾", "KST"],
  "Asia/Hong_Kong": ["香港", "HKT"],
  "Asia/Macau": ["澳門"],
  "Asia/Shanghai": ["China", "Beijing", "中國", "北京", "上海", "Shenzhen", "深圳"],
  "Asia/Singapore": ["新加坡", "SGT"],
  "Asia/Kuala_Lumpur": ["Malaysia", "馬來西亞", "吉隆坡"],
  "Asia/Bangkok": ["Thailand", "泰國", "曼谷"],
  "Asia/Ho_Chi_Minh": ["Vietnam", "Saigon", "越南", "胡志明"],
  "Asia/Manila": ["Philippines", "菲律賓", "馬尼拉"],
  "Asia/Jakarta": ["Indonesia", "印尼", "雅加達"],
  "Asia/Kolkata": ["India", "Mumbai", "Delhi", "印度", "IST"],
  "Asia/Dubai": ["UAE", "杜拜"],
  "Australia/Sydney": ["Australia", "澳洲", "雪梨", "悉尼", "AEST", "AEDT"],
  "Australia/Melbourne": ["墨爾本"],
  "Pacific/Auckland": ["New Zealand", "紐西蘭", "奧克蘭", "NZST"],
  "Europe/London": ["UK", "United Kingdom", "England", "Britain", "英國", "倫敦", "BST"],
  "Europe/Paris": ["France", "法國", "巴黎", "CET"],
  "Europe/Berlin": ["Germany", "德國", "柏林"],
  "Europe/Amsterdam": ["Netherlands", "荷蘭", "阿姆斯特丹"],
  "Europe/Madrid": ["Spain", "西班牙", "馬德里"],
  "Europe/Rome": ["Italy", "義大利", "羅馬"],
  "Europe/Zurich": ["Switzerland", "瑞士", "蘇黎世"],
  "America/New_York": ["USA", "US", "United States", "East Coast", "美國", "美東", "紐約", "EST", "EDT", "ET"],
  "America/Chicago": ["芝加哥", "CST", "CDT", "CT"],
  "America/Denver": ["丹佛", "MST", "MDT"],
  "America/Los_Angeles": ["California", "San Francisco", "Seattle", "美西", "洛杉磯", "舊金山", "西雅圖", "PST", "PDT", "PT"],
  "America/Toronto": ["Canada", "加拿大", "多倫多"],
  "America/Vancouver": ["溫哥華"],
  "America/Mexico_City": ["Mexico", "墨西哥"],
  "America/Sao_Paulo": ["Brazil", "巴西", "聖保羅"],
};

/** Shown under "Popular" before you type anything. */
export const POPULAR_TIMEZONES = [
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
];

export type TimeZoneInfo = {
  id: string;
  /** "Taipei", "Buenos Aires", "UTC" */
  city: string;
  /** "Asia", "America · Argentina" ("" for UTC) */
  region: string;
  /** "GMT+8" right now */
  offset: string;
};

export function timeZoneInfo(id: string, now = new Date()): TimeZoneInfo {
  const parts = id.split("/");
  return {
    id,
    city: timeZoneCity(id),
    region: parts.slice(0, -1).join(" · ").replaceAll("_", " "),
    offset: timeZoneOffsetLabel(id, now).replace(/^(UTC|GMT[+-]0)$/, "GMT"),
  };
}

/** "Taipei time (GMT+8)" */
export function describeTimeZone(id: string, now = new Date()) {
  const { city, offset } = timeZoneInfo(id, now);
  return `${city} time (${offset})`;
}

const squash = (text: string) => text.toLowerCase().replace(/[\s_]+/g, "");

/** "GMT+8" → ["gmt+8", "utc+8", "+8", "+08", "+0800", "+08:00"] (all squashed). */
function offsetForms(offset: string) {
  const match = /^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(offset);
  if (!match) return [];
  if (!match[1]) return ["gmt", "utc", "+0", "gmt+0", "utc+0"];
  const [, sign, h, m = "00"] = match;
  const hh = h.padStart(2, "0");
  const short = m === "00" ? `${sign}${Number(h)}` : `${sign}${Number(h)}:${m}`;
  return [`gmt${short}`, `utc${short}`, short, `${sign}${hh}`, `${sign}${hh}${m}`, `${sign}${hh}:${m}`];
}

/**
 * Timezones matching a search, best matches first: the city name, then the
 * extra names (country, Chinese, abbreviation), then the ID/region, then the
 * offset. Returns [] for an empty query.
 */
export function searchTimeZones(zones: TimeZoneInfo[], query: string, limit = 50) {
  const q = squash(query.trim());
  if (!q) return [];

  const scored: { zone: TimeZoneInfo; score: number }[] = [];
  for (const zone of zones) {
    const city = squash(zone.city);
    const aliases = (ALIASES[zone.id] ?? []).map(squash);
    let score = 0;
    if (city === q) score = 100;
    else if (aliases.includes(q)) score = 90;
    else if (city.startsWith(q)) score = 80;
    else if (aliases.some((a) => a.startsWith(q))) score = 70;
    else if (offsetForms(zone.offset).includes(q)) score = 60;
    else if (city.includes(q) || aliases.some((a) => a.includes(q))) score = 50;
    else if (squash(zone.id).includes(q)) score = 40;
    if (score > 0) scored.push({ zone, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.zone.city.localeCompare(b.zone.city))
    .slice(0, limit)
    .map((s) => s.zone);
}
