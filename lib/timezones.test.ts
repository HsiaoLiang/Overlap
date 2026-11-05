import { describe, expect, it } from "vitest";
import { describeTimeZone, searchTimeZones, timeZoneInfo } from "./timezones";

const zones = [
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Europe/London",
  "America/Los_Angeles",
  "America/Argentina/Buenos_Aires",
  "UTC",
].map((id) => timeZoneInfo(id, new Date(Date.UTC(2026, 10, 5))));

const ids = (query: string) => searchTimeZones(zones, query).map((z) => z.id);

describe("timeZoneInfo", () => {
  it("turns IDs into city, region and offset", () => {
    expect(timeZoneInfo("America/Argentina/Buenos_Aires")).toMatchObject({
      city: "Buenos Aires",
      region: "America · Argentina",
    });
    expect(describeTimeZone("Asia/Taipei")).toBe("Taipei time (GMT+8)");
    expect(timeZoneInfo("UTC").offset).toBe("GMT");
  });
});

describe("searchTimeZones", () => {
  it("finds cities, best match first", () => {
    expect(ids("taipei")[0]).toBe("Asia/Taipei");
    expect(ids("tok")).toEqual(["Asia/Tokyo"]);
    expect(ids("buenos aires")).toEqual(["America/Argentina/Buenos_Aires"]);
  });

  it("finds countries, Chinese names and abbreviations", () => {
    expect(ids("Taiwan")).toEqual(["Asia/Taipei"]);
    expect(ids("台北")).toEqual(["Asia/Taipei"]);
    expect(ids("東京")).toEqual(["Asia/Tokyo"]);
    expect(ids("PST")).toEqual(["America/Los_Angeles"]);
    expect(ids("india")).toEqual(["Asia/Kolkata"]);
  });

  it("finds offsets written several ways", () => {
    for (const q of ["+8", "GMT+8", "utc+8", "+08:00"]) {
      expect(ids(q)).toEqual(["Asia/Hong_Kong", "Asia/Shanghai", "Asia/Taipei"]);
    }
    expect(ids("+5:30")).toEqual(["Asia/Kolkata"]);
  });

  it("returns nothing for an empty search", () => {
    expect(ids("  ")).toEqual([]);
  });
});
