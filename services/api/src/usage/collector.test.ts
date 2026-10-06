import { describe, expect, it } from "bun:test";
import {
  assembleUsageSnapshot,
  fetchUsageUpstreams,
  MAX_PROFILE_REBUILDS_PER_TICK,
  parseLibraryPayload,
  parsePeoPayload,
  PEO_OCCUPANCY_URL,
  type UsageSnapshotRow,
} from "./collector";
import { taipeiSlotAt } from "./model";

describe("usage collector validation", () => {
  it("keeps the profile rebuild budget at two per tick", () => {
    expect(MAX_PROFILE_REBUILDS_PER_TICK).toBe(2);
  });

  it("rejects malformed and partial upstream payloads without throwing", () => {
    expect(parsePeoPayload({ status: 500, data: [] })).toBeNull();
    expect(
      parsePeoPayload({
        status: 200,
        data: [{ project_id: "a", project_name: "A" }],
      }),
    ).toBeNull();
    expect(parseLibraryPayload({ rescode: 1, rows: [{ zoneid: "1", zonename: "一區" }] })).toBeNull();
    expect(parseLibraryPayload({ rescode: 1, rows: [{ zoneid: "1", zonename: "一區", count: -1 }] })).toBeNull();
  });

  it("keeps a working source when the other upstream fails", async () => {
    const userAgents: string[] = [];
    const result = await fetchUsageUpstreams((async (url, init) => {
      userAgents.push(new Headers(init?.headers).get("User-Agent") ?? "");
      if (String(url) === PEO_OCCUPANCY_URL) throw new Error("PEO down");
      return new Response(
        JSON.stringify({
          rescode: 1,
          rows: [{ zoneid: "zone-1", zonename: "一區", count: 12 }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch);

    expect(result.gym.samples).toBeNull();
    expect(result.gym.error).toBeInstanceOf(Error);
    expect(result.library.samples).toEqual([{ id: "zone-1", name: "一區", value: 12 }]);
    expect(userAgents.length).toBe(2);
    expect(userAgents.every((value) => value.includes("NTHUMods-usage-history"))).toBe(true);
  });
});

describe("usage snapshot assembly", () => {
  it("emits an uncached series as learning instead of dropping it", () => {
    const now = new Date("2026-10-07T10:30:00.000Z");
    const row: UsageSnapshotRow = {
      source: "library",
      seriesId: "zone-uncached",
      name: "未快取區域",
      current: 12,
      lastSampleAt: now.toISOString(),
      lastValueChangedAt: now.toISOString(),
      lastSuccessfulAt: now.toISOString(),
      profileData: null,
      profileUpdatedAt: null,
      anomalyType: null,
      anomalySince: null,
      anomalySamples: null,
      anomalyLastObservedAt: null,
    };
    const assembled = assembleUsageSnapshot(
      "library",
      [row],
      new Map(),
      new Map([[row.seriesId, [{ slot: 21, value: 12 }]]]),
      now,
      taipeiSlotAt(now),
    );
    expect(assembled.response.series).toHaveLength(1);
    expect(assembled.response.series[0]).toMatchObject({
      id: row.seriesId,
      status: "learning",
      current: 12,
      week: [],
    });
  });
});
