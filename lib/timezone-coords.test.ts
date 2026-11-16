import { describe, expect, it } from "vitest";
import { nearestCity, offsetMinutes, timeZoneCoords } from "./timezone-coords";

describe("offsetMinutes", () => {
  it("reads offset labels", () => {
    expect(offsetMinutes("GMT+8")).toBe(480);
    expect(offsetMinutes("GMT-3:30")).toBe(-210);
    expect(offsetMinutes("GMT+5:45")).toBe(345);
    expect(offsetMinutes("GMT")).toBe(0);
    expect(offsetMinutes("UTC")).toBe(0);
  });

  it("treats anything else as Greenwich", () => {
    expect(offsetMinutes("")).toBe(0);
    expect(offsetMinutes("PST")).toBe(0);
  });
});

describe("timeZoneCoords", () => {
  it("knows the common cities", () => {
    expect(timeZoneCoords("Asia/Taipei")).toEqual({ lat: 25.03, lon: 121.57, exact: true });
    expect(timeZoneCoords("America/Los_Angeles").lon).toBeLessThan(-100);
  });

  it("places other zones by their UTC offset", () => {
    const winter = new Date("2026-01-15T12:00:00Z");
    // Kathmandu is GMT+5:45 → 86.25° east.
    expect(timeZoneCoords("Asia/Kathmandu", winter)).toEqual({ lat: 25, lon: 86.25, exact: false });
    // Honolulu is GMT-10 → 150° west.
    expect(timeZoneCoords("Pacific/Honolulu", winter).lon).toBe(-150);
    expect(timeZoneCoords("UTC", winter).lon).toBe(0);
  });

  it("never leaves the map", () => {
    // Kiritimati is GMT+14, which would be 210° east.
    expect(timeZoneCoords("Pacific/Kiritimati").lon).toBe(180);
  });
});

describe("nearestCity", () => {
  it("finds the city at a longitude", () => {
    expect(nearestCity(139)).toBe("Asia/Tokyo");
    expect(nearestCity(0)).toBe("Europe/London");
    expect(nearestCity(-74)).toBe("America/New_York");
  });

  it("goes the short way round the date line", () => {
    // 179°W is 6° from Auckland (174.76°E), not 354°.
    expect(nearestCity(-179)).toBe("Pacific/Auckland");
  });
});
