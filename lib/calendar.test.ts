import { describe, expect, it } from "vitest";
import { calendarEntry, googleCalendarUrl, outlookCalendarUrl, toICS, utcStamp } from "./calendar";
import type { Participant } from "./types";

const dinner = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "團隊聚餐, part 2; bring snacks",
  date_mode: "dates" as const,
  days: ["2026-11-19"],
  start_minute: 17 * 60,
  end_minute: 22 * 60,
  timezone: "Asia/Taipei",
};
const range = { start: "2026-11-19 19:00", end: "2026-11-19 20:30" };
const person = (name: string, slots: string[]): Participant => ({ id: name, name, slots, hasPin: false });
const people = [
  person("Alex", ["2026-11-19 19:00", "2026-11-19 19:30", "2026-11-19 20:00"]),
  person("Bea", []),
];
const url = "https://overlapping.day/e/x7k2pq";

describe("calendarEntry", () => {
  it("converts the final time to UTC and lists who's coming", () => {
    const entry = calendarEntry(dinner, range, people, url);
    expect(utcStamp(entry.start)).toBe("20261119T110000Z"); // 19:00 in Taipei
    expect(utcStamp(entry.end)).toBe("20261119T123000Z");
    expect(entry.weekly).toBe(false);
    expect(entry.description).toBe(`Event page: ${url}\nComing: Alex\nCan't make it: Bea`);
  });

  it("starts weekday events at the next occurrence and repeats them", () => {
    const weekly = { ...dinner, date_mode: "weekdays" as const, days: ["wed"] };
    const wed = { start: "wed 19:00", end: "wed 20:00" };
    // Thursday 19 Nov 2026: this week's Wednesday has passed → next Wednesday, 25 Nov.
    const entry = calendarEntry(weekly, wed, [], url, Date.UTC(2026, 10, 19));
    expect(utcStamp(entry.start)).toBe("20261125T110000Z");
    expect(entry.weekly).toBe(true);
    // Monday 16 Nov: this week's Wednesday is still ahead → 18 Nov.
    expect(utcStamp(calendarEntry(weekly, wed, [], url, Date.UTC(2026, 10, 16)).start)).toBe(
      "20261118T110000Z",
    );
  });
});

describe("calendar links and files", () => {
  const entry = calendarEntry(dinner, range, people, url);

  it("builds a Google Calendar link", () => {
    const link = new URL(googleCalendarUrl(entry));
    expect(link.searchParams.get("dates")).toBe("20261119T110000Z/20261119T123000Z");
    expect(link.searchParams.get("text")).toBe(dinner.name);
    expect(link.searchParams.get("recur")).toBeNull();
  });

  it("builds an Outlook link", () => {
    const link = new URL(outlookCalendarUrl(entry));
    expect(link.searchParams.get("startdt")).toBe("2026-11-19T11:00:00.000Z");
  });

  it("writes a valid .ics file: escaped text, CRLF, lines of at most 75 bytes", () => {
    const ics = toICS(entry, Date.UTC(2026, 10, 1));
    expect(ics).toContain("DTSTART:20261119T110000Z\r\n");
    expect(ics).toContain("SUMMARY:團隊聚餐\\, part 2\\; bring snacks\r\n");
    expect(ics).not.toContain("RRULE");
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Unfolding (removing CRLF + space) restores the description.
    expect(ics.replace(/\r\n /g, "")).toContain(
      `DESCRIPTION:Event page: ${url}\\nComing: Alex\\nCan't make it: Bea`,
    );
  });

  it("adds a weekly rule for weekday events", () => {
    const weekly = { ...dinner, date_mode: "weekdays" as const, days: ["wed"] };
    const ics = toICS(calendarEntry(weekly, { start: "wed 19:00", end: "wed 20:00" }, [], url));
    expect(ics).toContain("RRULE:FREQ=WEEKLY\r\n");
  });
});
