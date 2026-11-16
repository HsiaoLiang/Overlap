import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/host", () => ({
  createHostToken: () => ({ token: "host-token", hash: "host-hash" }),
  isHostToken: () => true,
}));
vi.mock("@/lib/data", () => ({
  getEvent: vi.fn(),
  getEventWithHostHash: vi.fn(),
  getParticipants: vi.fn(),
}));

import { createEvent, updatePlace } from "../app/actions";
import { getEventWithHostHash } from "@/lib/data";
import { PLACE_MAX_LENGTH } from "@/lib/place";
import { createServerClient } from "@/lib/supabase/server";

const input = {
  name: "Team meeting",
  dateMode: "weekdays" as const,
  days: ["mon"],
  startMinute: 540,
  endMinute: 600,
  timezone: "Asia/Taipei",
};

const insert = vi.fn().mockResolvedValue({ error: null });
const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const from = vi.fn(() => ({ insert, update }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerClient).mockReturnValue({ from } as never);
  vi.mocked(getEventWithHostHash).mockResolvedValue({
    id: "event-id",
    host_token_hash: "host-hash",
  } as never);
});

describe("meeting link validation", () => {
  it("stores a complete long meeting URL on creation and editing", async () => {
    const place = `https://teams.microsoft.com/l/meetup-join/${"a".repeat(300)}?context=tenant-id`;
    expect((await createEvent({ ...input, place })).ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ place }));
    expect(await updatePlace({ slug: "abc123", token: "host-token", place })).toEqual({
      ok: true,
      place,
    });
    expect(update).toHaveBeenCalledWith({ place });
  });

  it("rejects an oversized place before making a database request", async () => {
    const place = "a".repeat(PLACE_MAX_LENGTH + 1);
    for (const result of [
      await createEvent({ ...input, place }),
      await updatePlace({ slug: "abc123", token: "host-token", place }),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain(String(PLACE_MAX_LENGTH));
    }
    expect(createServerClient).not.toHaveBeenCalled();
    expect(getEventWithHostHash).not.toHaveBeenCalled();
  });
});
