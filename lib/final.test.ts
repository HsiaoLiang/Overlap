import { describe, expect, it } from "vitest";
import {
  attendance,
  describeFinal,
  finalRangeError,
  finalRangeKeys,
  maxLengthFrom,
  rangeFrom,
} from "./final";
import type { Participant } from "./types";

const dinner = {
  date_mode: "dates" as const,
  days: ["2026-11-18", "2026-11-19"],
  start_minute: 17 * 60,
  end_minute: 22 * 60,
  timezone: "Asia/Taipei",
};
const weekly = { ...dinner, date_mode: "weekdays" as const, days: ["mon", "wed"], start_minute: 9 * 60 };

describe("finalRangeError", () => {
  it("accepts a range inside the event", () => {
    expect(finalRangeError(dinner, { start: "2026-11-19 19:00", end: "2026-11-19 20:30" })).toBeNull();
    // Ending exactly at the event's end is fine.
    expect(finalRangeError(dinner, { start: "2026-11-19 21:30", end: "2026-11-19 22:00" })).toBeNull();
    expect(finalRangeError(weekly, { start: "wed 09:00", end: "wed 10:00" })).toBeNull();
  });

  it("rejects days that aren't part of the event", () => {
    expect(finalRangeError(dinner, { start: "2026-11-20 19:00", end: "2026-11-20 20:00" })).toMatch(/day/);
    expect(finalRangeError(weekly, { start: "tue 09:00", end: "tue 10:00" })).toMatch(/day/);
  });

  it("rejects ranges outside the event's hours", () => {
    expect(finalRangeError(dinner, { start: "2026-11-19 16:30", end: "2026-11-19 18:00" })).toMatch(/hours/);
    expect(finalRangeError(dinner, { start: "2026-11-19 21:00", end: "2026-11-19 22:30" })).toMatch(/hours/);
  });

  it("rejects ranges that cross days, run backwards or are empty", () => {
    expect(finalRangeError(dinner, { start: "2026-11-18 21:00", end: "2026-11-19 18:00" })).toMatch(/same day/);
    expect(finalRangeError(dinner, { start: "2026-11-19 20:00", end: "2026-11-19 19:00" })).toMatch(/after/);
    expect(finalRangeError(dinner, { start: "2026-11-19 19:00", end: "2026-11-19 19:00" })).toMatch(/after/);
  });

  it("rejects times off the half-hour grid and malformed input", () => {
    expect(finalRangeError(dinner, { start: "2026-11-19 19:15", end: "2026-11-19 20:00" })).toMatch(/half hour/);
    expect(finalRangeError(dinner, { start: "tomorrow", end: "2026-11-19 20:00" })).toMatch(/valid/);
  });
});

describe("range helpers", () => {
  it("lists the covered slots, end exclusive", () => {
    expect(finalRangeKeys({ start: "wed 09:00", end: "wed 10:30" })).toEqual([
      "wed 09:00",
      "wed 09:30",
      "wed 10:00",
    ]);
  });

  it("builds a range from a start and a length, up to the end of the day", () => {
    expect(rangeFrom("2026-11-19 19:00", 90)).toEqual({ start: "2026-11-19 19:00", end: "2026-11-19 20:30" });
    expect(maxLengthFrom(dinner, "2026-11-19 21:00")).toBe(60);
  });
});

describe("describeFinal", () => {
  const range = { start: "2026-11-19 19:00", end: "2026-11-19 20:30" };

  it("shows the date and time in the event's timezone", () => {
    expect(describeFinal(dinner, range, "Asia/Taipei")).toEqual({
      day: "Thu 19 Nov",
      time: "19:00–20:30",
      duration: "1 h 30 min",
    });
  });

  it("converts to another timezone, including the date", () => {
    // 19:00 Thu in Taipei = 11:00 Thu in London (UTC+0 in November)…
    expect(describeFinal(dinner, range, "Europe/London")).toMatchObject({ day: "Thu 19 Nov", time: "11:00–12:30" });
    // …and 03:00 Thu in Los Angeles (UTC−8).
    expect(describeFinal(dinner, range, "America/Los_Angeles")).toMatchObject({ day: "Thu 19 Nov", time: "03:00–04:30" });
  });

  it("gives weekday events a plural weekday and no date", () => {
    const wed = { start: "wed 09:00", end: "wed 10:30" };
    expect(describeFinal(weekly, wed, "Asia/Taipei")).toEqual({
      day: "Wednesdays",
      time: "09:00–10:30",
      duration: "1 h 30 min",
    });
    // 09:00 Wednesday in Taipei is 17:00 Tuesday in Los Angeles.
    expect(describeFinal(weekly, wed, "America/Los_Angeles", Date.UTC(2026, 10, 4))).toMatchObject({
      day: "Tuesdays",
      time: "17:00–18:30",
    });
  });
});

describe("attendance", () => {
  const person = (name: string, slots: string[]): Participant => ({ id: name, name, slots, hasPin: false });

  it("counts only people free for the whole range", () => {
    const { free, cantMake } = attendance({ start: "wed 09:00", end: "wed 10:00" }, [
      person("Alex", ["wed 09:00", "wed 09:30"]),
      person("Bea", ["wed 09:00"]), // free for half of it
      person("Cy", []),
    ]);
    expect(free.map((p) => p.name)).toEqual(["Alex"]);
    expect(cantMake.map((p) => p.name)).toEqual(["Bea", "Cy"]);
  });
});
