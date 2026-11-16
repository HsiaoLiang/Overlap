import { describe, expect, it } from "vitest";
import { DEMO_PEOPLE, demoAvailable, demoDayOffset, demoMinutes, demoTime } from "./moment-demo";

describe("the shared-moment example", () => {
  it("uses the same instant in all three cities, including the next day", () => {
    expect(DEMO_PEOPLE.map((person) => demoTime(810, person.zone))).toEqual(["13:30", "08:30", "21:30"]);
    expect(demoTime(18 * 60, "Asia/Taipei")).toBe("02:00");
    expect(demoMinutes(18 * 60, "Asia/Taipei")).toBe(120);
    expect(demoDayOffset(18 * 60, "Asia/Taipei")).toBe(1);
    expect(demoDayOffset(13 * 60, "Asia/Taipei")).toBe(0);
    expect(demoDayOffset(0, "America/New_York")).toBe(-1);
  });
  it("finds the shared hour, excluding its end boundary", () => {
    const count = (minute: number) => DEMO_PEOPLE.filter((person) => demoAvailable(person, minute)).length;
    expect(count(12 * 60)).toBe(2);
    expect(count(13 * 60)).toBe(3);
    expect(count(13 * 60 + 30)).toBe(3);
    expect(count(14 * 60)).toBe(2);
  });
});
