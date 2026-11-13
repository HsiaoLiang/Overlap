import { describe, expect, it } from "vitest";
import { deleteAfterDate } from "./retention";

const base = {
  timezone: "Asia/Taipei",
  created_at: "2026-01-10T08:00:00Z",
  finalised_at: null,
};
const dates = { ...base, date_mode: "dates" as const, days: ["2026-11-18", "2026-11-19"] };
const weekdays = { ...base, date_mode: "weekdays" as const, days: ["mon", "wed"] };

describe("deleteAfterDate", () => {
  it("dates: 30 days after the last date", () => {
    expect(deleteAfterDate(dates)).toBe("2026-12-19");
  });

  it("dates: uses the latest date even if unsorted", () => {
    expect(deleteAfterDate({ ...dates, days: ["2026-11-19", "2026-11-18"] })).toBe("2026-12-19");
  });

  it("dates: ignores responses", () => {
    expect(deleteAfterDate(dates, "2027-05-01T00:00:00Z")).toBe("2026-12-19");
  });

  it("weekdays: 90 days after creation when nothing else happened", () => {
    expect(deleteAfterDate(weekdays)).toBe("2026-04-10");
  });

  it("weekdays: the latest of created, finalised and response times wins", () => {
    expect(deleteAfterDate({ ...weekdays, finalised_at: "2026-02-01T00:00:00Z" })).toBe("2026-05-02");
    expect(
      deleteAfterDate({ ...weekdays, finalised_at: "2026-02-01T00:00:00Z" }, "2026-03-01T00:00:00Z"),
    ).toBe("2026-05-30");
    expect(deleteAfterDate(weekdays, null)).toBe("2026-04-10");
  });

  it("weekdays: counts the day in the event's timezone", () => {
    // 20:00 UTC on 1 Mar is already 2 Mar in Taipei (UTC+8).
    expect(deleteAfterDate(weekdays, "2026-03-01T20:00:00Z")).toBe("2026-05-31");
  });
});
