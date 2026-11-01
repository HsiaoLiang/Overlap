import { describe, expect, it } from "vitest";
import { bestTimes, freeBySlot, heatStrength } from "./availability";
import type { Participant } from "./types";

const person = (name: string, slots: string[]): Participant => ({
  id: name,
  name,
  slots,
  hasPin: false,
});

describe("freeBySlot", () => {
  it("groups people by the slots they're free", () => {
    const map = freeBySlot([
      person("Alex", ["mon 09:00", "mon 09:30"]),
      person("Bea", ["mon 09:30"]),
      person("Cy", []),
    ]);
    expect(map.get("mon 09:00")!.map((p) => p.name)).toEqual(["Alex"]);
    expect(map.get("mon 09:30")!.map((p) => p.name)).toEqual(["Alex", "Bea"]);
    expect(map.has("mon 10:00")).toBe(false);
  });
});

describe("heatStrength", () => {
  it("is 0 when nobody is free and 100 when everyone is", () => {
    expect(heatStrength(0, 5)).toBe(0);
    expect(heatStrength(5, 5)).toBe(100);
  });
  it("keeps a single person visible", () => {
    expect(heatStrength(1, 50)).toBeGreaterThanOrEqual(20);
  });
});

describe("bestTimes", () => {
  const event = { days: ["2026-11-09", "2026-11-10"], start_minute: 17 * 60, end_minute: 21 * 60 };
  // Build slots like "2026-11-09 18:00" for [from, to) in hours.
  const range = (day: string, from: number, to: number) => {
    const keys: string[] = [];
    for (let m = from * 60; m < to * 60; m += 30) {
      keys.push(`${day} ${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 === 0 ? "00" : "30"}`);
    }
    return keys;
  };

  it("merges neighbouring slots with the same people into one range", () => {
    const result = bestTimes(event, [
      person("Alex", range("2026-11-09", 18, 20)),
      person("Bea", range("2026-11-09", 18, 20)),
    ]);
    expect(result[0].keys).toEqual(range("2026-11-09", 18, 20));
    expect(result[0].free.map((p) => p.name)).toEqual(["Alex", "Bea"]);
  });

  it("ranks by people free, then length, then earliest", () => {
    const result = bestTimes(event, [
      person("Alex", [...range("2026-11-09", 17, 18), ...range("2026-11-10", 18, 20)]),
      person("Bea", [...range("2026-11-09", 17, 18), ...range("2026-11-10", 18, 20)]),
      person("Cy", range("2026-11-09", 17, 18)),
    ]);
    expect(result[0].id).toBe("2026-11-09 17:00"); // 3 people
    expect(result[1].id).toBe("2026-11-10 18:00"); // 2 people
  });

  it("skips ranges right next to one already picked", () => {
    const result = bestTimes(event, [
      person("Alex", range("2026-11-09", 18, 20)),
      person("Bea", range("2026-11-09", 18, 19)), // 18–19 has 2 people, 19–20 only Alex
      person("Cy", range("2026-11-10", 20, 21)),
    ]);
    expect(result.map((r) => r.id)).toEqual(["2026-11-09 18:00", "2026-11-10 20:00"]);
  });

  it("returns nothing when nobody has picked a time", () => {
    expect(bestTimes(event, [person("Alex", [])])).toEqual([]);
    expect(bestTimes(event, [])).toEqual([]);
  });
});
