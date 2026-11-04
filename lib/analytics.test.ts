import { describe, expect, it } from "vitest";
import { anonymiseUrl } from "./analytics";

describe("anonymiseUrl", () => {
  it("removes the organiser token and the event slug", () => {
    expect(anonymiseUrl("https://overlap.app/e/x7k2pq#host=abcdefghijklmnopqrstuvwxyz012345")).toBe(
      "https://overlap.app/e/[slug]",
    );
  });

  it("removes query strings and leaves other pages alone", () => {
    expect(anonymiseUrl("https://overlap.app/?utm_source=line")).toBe("https://overlap.app/");
    expect(anonymiseUrl("https://overlap.app/nope")).toBe("https://overlap.app/nope");
  });
});
