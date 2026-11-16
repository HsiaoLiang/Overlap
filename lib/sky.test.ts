import { describe, expect, it } from "vitest";
import { SKY_PHOTOS, skyAt, skyPhotos, skyTone, timeToMinutes } from "./sky";

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

describe("skyPhotos", () => {
  const photos = (time: string) => skyPhotos(timeToMinutes(time));

  it("shows one photo in the middle of each part of the day", () => {
    expect(photos("02:00").night).toBe(1);
    expect(photos("06:00").dawn).toBe(1);
    expect(photos("12:00").day).toBe(1);
    expect(photos("18:00").sunset).toBe(1);
    expect(photos("19:45").dusk).toBe(1);
    expect(photos("23:00").night).toBe(1);
  });

  it("fades between two photos in between", () => {
    const fading = photos("16:45"); // halfway from day to sunset
    expect(fading.day).toBeCloseTo(0.5);
    expect(fading.sunset).toBeCloseTo(0.5);
    expect(fading.night + fading.dawn + fading.dusk).toBe(0);
  });

  it("always adds up to one", () => {
    for (let m = -90; m < 1440 + 90; m += 7) {
      const total = SKY_PHOTOS.reduce((sum, photo) => sum + skyPhotos(m)[photo], 0);
      expect(total).toBeCloseTo(1);
    }
  });

  it("has no jump at midnight", () => {
    expect(skyPhotos(1439.999).night).toBeCloseTo(1);
    expect(skyPhotos(0).night).toBe(1);
  });
});

describe("skyTone", () => {
  it("is light only around dawn", () => {
    expect(skyTone(timeToMinutes("06:00"))).toBe("light");
    for (const time of ["00:00", "04:30", "09:00", "12:00", "18:00", "20:00", "23:30"]) {
      expect(skyTone(timeToMinutes(time))).toBe("dark");
    }
  });
});
