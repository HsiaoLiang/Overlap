import { describe, expect, it } from "vitest";
import { clockMinutes, worldClock, worldDate, worldInstant, worldLight } from "./world-time";

describe("the world-time observatory", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  it("moves one instant through different cities and dates", () => {
    const instant = worldInstant(now, "Europe/London", 18 * 60);
    expect(worldClock(instant, "America/New_York")).toBe("13:00");
    expect(worldClock(instant, "Asia/Taipei")).toBe("02:00");
    expect(worldDate(instant, "Asia/Taipei")).toContain("19 Nov");
    expect(clockMinutes(instant, "Asia/Taipei")).toBe(120);
  });
  it("honours summer time and fractional offsets", () => {
    expect(worldClock(worldInstant(Date.parse("2026-07-01T12:00:00Z"), "Europe/London", 18 * 60), "UTC")).toBe("17:00");
    expect(worldClock(worldInstant(now, "Asia/Kolkata", 18 * 60), "UTC")).toBe("12:30");
    expect(worldInstant(now, "Asia/Tokyo", null)).toBe(now);
  });
  it("wraps the artwork smoothly at midnight", () => {
    expect(worldLight(0)).toEqual(worldLight(1440));
    expect(worldLight(-60)).toEqual(worldLight(1380));
    expect(worldLight(12 * 60).brightness).toBeGreaterThan(worldLight(0).brightness);
    expect(worldLight(0).night).toBe(1);
  });
});
