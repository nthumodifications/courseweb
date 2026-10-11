import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  isUnreadableWeek,
  syncPeoOpeningTimes,
  type DaySchedule,
} from "./peo-opening-times";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const closedWeek = (notes: string | null): DaySchedule => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
  holiday: [],
  notes,
});

describe("isUnreadableWeek", () => {
  it("treats an empty week with no reason as a failed parse", () => {
    expect(isUnreadableWeek(closedWeek(null))).toBe(true);
    expect(isUnreadableWeek(closedWeek("  "))).toBe(true);
  });

  it("keeps a facility that is closed for a stated reason", () => {
    expect(isUnreadableWeek(closedWeek("場地施工期間暫停開放"))).toBe(false);
  });

  it("keeps any week with open slots", () => {
    const week = closedWeek(null);
    week.saturday = [{ open: "07:00", close: "21:30" }];
    expect(isUnreadableWeek(week)).toBe(false);
  });
});

describe("syncPeoOpeningTimes", () => {
  it("uses a timeout for the scheduled page fetch", async () => {
    let requestInit: RequestInit | undefined;
    globalThis.fetch = mock(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestInit = init;
        return new Response("unavailable", { status: 503 });
      },
    ) as unknown as typeof fetch;

    await expect(syncPeoOpeningTimes({ DB: {} } as never)).rejects.toThrow(
      "Failed to fetch PEO page",
    );
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
  });
});
