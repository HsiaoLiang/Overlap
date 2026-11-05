import { describe, expect, it } from "vitest";
import { parseTimeInput } from "./time";

describe("parseTimeInput", () => {
  it("reads common ways of typing a time", () => {
    expect(parseTimeInput("9")).toBe(9 * 60);
    expect(parseTimeInput("09")).toBe(9 * 60);
    expect(parseTimeInput("930")).toBe(9 * 60 + 30);
    expect(parseTimeInput("0930")).toBe(9 * 60 + 30);
    expect(parseTimeInput("9:30")).toBe(9 * 60 + 30);
    expect(parseTimeInput(" 21.30 ")).toBe(21 * 60 + 30);
    expect(parseTimeInput("2130")).toBe(21 * 60 + 30);
    expect(parseTimeInput("24:00")).toBe(1440);
  });

  it("understands am and pm", () => {
    expect(parseTimeInput("9pm")).toBe(21 * 60);
    expect(parseTimeInput("9:30 PM")).toBe(21 * 60 + 30);
    expect(parseTimeInput("12am")).toBe(0);
    expect(parseTimeInput("12pm")).toBe(12 * 60);
  });

  it("rounds to the nearest half hour", () => {
    expect(parseTimeInput("9:10")).toBe(9 * 60);
    expect(parseTimeInput("9:15")).toBe(9 * 60 + 30);
    expect(parseTimeInput("23:50")).toBe(1440);
  });

  it("rejects things that aren't times", () => {
    for (const bad of ["", "abc", "25", "9:75", "24:30", "13pm", "0am", "9::30"]) {
      expect(parseTimeInput(bad)).toBeNull();
    }
  });
});
