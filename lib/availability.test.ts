import { describe, expect, it } from "vitest";
import { freeBySlot, heatStrength } from "./availability";
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
