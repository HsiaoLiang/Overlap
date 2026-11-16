import { describe, expect, it } from "vitest";
import { skyAt, timeToMinutes } from "./sky";

/** "oklab(0.64 -0.05 -0.14)" → { l, a, b } */
function lab(colour: string) {
  const [l, a, b] = colour.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return { l, a, b };
}

const at = (time: string) => skyAt(timeToMinutes(time));

describe("timeToMinutes", () => {
  it("reads HH:MM", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("19:30")).toBe(1170);
  });
});

describe("skyAt", () => {
  it("is blue at midday", () => {
    const top = lab(at("12:00").top);
    expect(top.b).toBeLessThan(-0.1); // negative b = blue
    expect(top.l).toBeGreaterThan(0.6);
  });

  it("is near-black at night", () => {
    expect(lab(at("00:00").top).l).toBeLessThan(0.15);
    expect(lab(at("02:30").top).l).toBeLessThan(0.15);
    expect(lab(at("23:00").top).l).toBeLessThan(0.15);
  });

  it("glows orange on the horizon at sunrise and sunset", () => {
    for (const time of ["06:30", "18:15"]) {
      const bottom = lab(at(time).bottom);
      expect(bottom.a).toBeGreaterThan(0.03); // towards red
      expect(bottom.b).toBeGreaterThan(0.08); // towards yellow
    }
  });

  it("midday is the brightest and midnight the darkest", () => {
    const lightness = ["00:00", "06:00", "12:00", "18:30", "22:00"].map((t) => lab(at(t).top).l);
    expect(Math.max(...lightness)).toBe(lightness[2]);
    expect(Math.min(...lightness)).toBe(lightness[0]);
  });

  it("has no jump at midnight", () => {
    expect(skyAt(1439.999)).toEqual(skyAt(0));
  });

  it("changes a little at a time", () => {
    // Half an hour apart (one grid row) is never a big jump in lightness.
    for (let m = 0; m < 1440; m += 30) {
      const step = Math.abs(lab(skyAt(m).bottom).l - lab(skyAt(m + 30).bottom).l);
      expect(step).toBeLessThan(0.25);
    }
  });

  it("wraps times outside one day", () => {
    expect(skyAt(1440 + 720)).toEqual(skyAt(720));
    expect(skyAt(-60)).toEqual(skyAt(1380));
  });
});
