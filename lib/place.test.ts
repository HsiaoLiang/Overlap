import { describe, expect, it } from "vitest";
import { isOnlyLink, mapsUrl, normalisePlace, placeParts, PLACE_MAX_LENGTH } from "./place";

describe("normalisePlace", () => {
  it("trims and collapses spaces", () => {
    expect(normalisePlace("  Blue   Bottle,\n Xinyi ")).toBe("Blue Bottle, Xinyi");
  });

  it("is null when empty", () => {
    expect(normalisePlace("")).toBeNull();
    expect(normalisePlace("   ")).toBeNull();
    expect(normalisePlace(null)).toBeNull();
    expect(normalisePlace(undefined)).toBeNull();
  });

  it("cuts very long text", () => {
    expect(normalisePlace("a".repeat(500))).toHaveLength(PLACE_MAX_LENGTH);
  });
});

describe("placeParts", () => {
  it("leaves a plain place alone", () => {
    expect(placeParts("Blue Bottle, Xinyi")).toEqual([{ text: "Blue Bottle, Xinyi" }]);
  });

  it("links a meeting link", () => {
    expect(placeParts("https://meet.google.com/abc-defg-hij")).toEqual([
      { text: "meet.google.com/abc-defg-hij", href: "https://meet.google.com/abc-defg-hij" },
    ]);
  });

  it("links a link typed without https://", () => {
    expect(placeParts("zoom.us/j/123456?pwd=abc")).toEqual([
      { text: "zoom.us/j/123456?pwd=abc", href: "https://zoom.us/j/123456?pwd=abc" },
    ]);
  });

  it("links a link inside a sentence, without its trailing punctuation", () => {
    expect(placeParts("Room 3, or https://meet.example/abc.")).toEqual([
      { text: "Room 3, or " },
      { text: "meet.example/abc", href: "https://meet.example/abc" },
      { text: "." },
    ]);
  });

  it("never links anything but http and https", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,<b>x</b>", "ftp://files.example/x"]) {
      expect(placeParts(bad).every((part) => part.href === undefined)).toBe(true);
    }
  });

  it("doesn't link things that only look a bit like links", () => {
    expect(placeParts("3F., No. 7")).toEqual([{ text: "3F., No. 7" }]);
    expect(placeParts("http://localhost/x")).toEqual([{ text: "http://localhost/x" }]);
    expect(placeParts("https://user:pass@evil.example/")).toEqual([
      { text: "https://user:pass@evil.example/" },
    ]);
  });
});

describe("isOnlyLink", () => {
  it("tells online meetings from places", () => {
    expect(isOnlyLink("https://meet.google.com/abc")).toBe(true);
    expect(isOnlyLink("meet.google.com/abc")).toBe(true);
    expect(isOnlyLink("Blue Bottle, Xinyi")).toBe(false);
    expect(isOnlyLink("Room 3 or https://meet.example/abc")).toBe(false);
  });
});

describe("mapsUrl", () => {
  it("searches for the place", () => {
    expect(mapsUrl("Blue Bottle, 信義")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Blue%20Bottle%2C%20%E4%BF%A1%E7%BE%A9",
    );
  });
});
