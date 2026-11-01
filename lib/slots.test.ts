import { describe, expect, it } from "vitest";
import { buildViewerGrid, slotKeys } from "./slots";
import type { OverlapEvent } from "./types";

const taipeiDinner: Pick<
  OverlapEvent,
  "date_mode" | "days" | "start_minute" | "end_minute" | "timezone"
> = {
  date_mode: "dates",
  days: ["2026-11-03", "2026-11-04"],
  start_minute: 9 * 60,
  end_minute: 21 * 60,
  timezone: "Asia/Taipei",
};

describe("slotKeys", () => {
  it("lists every 30-minute slot, day by day", () => {
    const keys = slotKeys(taipeiDinner);
    expect(keys).toHaveLength(2 * 24);
    expect(keys[0]).toBe("2026-11-03 09:00");
    expect(keys[23]).toBe("2026-11-03 20:30");
    expect(keys[24]).toBe("2026-11-04 09:00");
  });
});

describe("buildViewerGrid", () => {
  it("is the plain grid when the viewer shares the event's timezone", () => {
    const grid = buildViewerGrid(taipeiDinner, "Asia/Taipei");
    expect(grid.columns.map((c) => c.id)).toEqual(["2026-11-03", "2026-11-04"]);
    expect(grid.columns[0]).toMatchObject({ label: "Tue", sublabel: "3 Nov" });
    expect(grid.rows).toHaveLength(24);
    expect(grid.rows[0].time).toBe("09:00");
    expect(grid.cells[0][0]).toBe("2026-11-03 09:00");
    expect(grid.cells[23][1]).toBe("2026-11-04 20:30");
    expect(grid.rows.some((r) => r.gapBefore)).toBe(false);
  });

  it("shifts times for a viewer in London (8 hours behind in November)", () => {
    const grid = buildViewerGrid(taipeiDinner, "Europe/London");
    expect(grid.columns.map((c) => c.id)).toEqual(["2026-11-03", "2026-11-04"]);
    expect(grid.rows[0].time).toBe("01:00");
    expect(grid.rows.at(-1)!.time).toBe("12:30");
    expect(grid.cells[0][0]).toBe("2026-11-03 09:00");
  });

  it("splits days across midnight for a viewer in Los Angeles", () => {
    // 09:00 Tue in Taipei = 17:00 Mon in LA (PST, UTC−8).
    const grid = buildViewerGrid(taipeiDinner, "America/Los_Angeles");
    expect(grid.columns.map((c) => c.id)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    const times = grid.rows.map((r) => r.time);
    expect(times[0]).toBe("00:00");
    expect(times).toContain("04:30");
    expect(times).toContain("17:00");
    expect(times).not.toContain("05:00");
    // A visual gap between 04:30 and 17:00.
    expect(grid.rows.find((r) => r.time === "17:00")!.gapBefore).toBe(true);
    // Mon 2 Nov 17:00 LA is the first Taipei slot; Mon morning isn't part of the event.
    const row17 = times.indexOf("17:00");
    expect(grid.cells[row17][0]).toBe("2026-11-03 09:00");
    expect(grid.cells[0][0]).toBeNull();
  });

  it("handles half-hour and 45-minute offsets", () => {
    const india = buildViewerGrid(taipeiDinner, "Asia/Kolkata"); // UTC+5:30
    expect(india.rows[0].time).toBe("06:30");
    const nepal = buildViewerGrid(taipeiDinner, "Asia/Kathmandu"); // UTC+5:45
    expect(nepal.rows[0].time).toBe("06:45");
    expect(nepal.rows).toHaveLength(24);
  });

  it("converts weekday events, moving columns to the viewer's weekday", () => {
    const weekly = { ...taipeiDinner, date_mode: "weekdays" as const, days: ["mon", "tue"] };
    const sameZone = buildViewerGrid(weekly, "Asia/Taipei");
    expect(sameZone.columns.map((c) => c.label)).toEqual(["Mon", "Tue"]);
    expect(sameZone.cells[0][0]).toBe("mon 09:00");

    const la = buildViewerGrid(weekly, "America/Los_Angeles", Date.UTC(2026, 10, 4));
    expect(la.columns.map((c) => c.id)).toEqual(["sun", "mon", "tue"]);
  });
});
