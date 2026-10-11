import { afterEach, describe, expect, test, mock } from "bun:test";
import youbike, { parseYouBikePayload } from "./youbike";

const originalFetch = globalThis.fetch;
const originalCaches = (globalThis as typeof globalThis & { caches?: unknown })
  .caches;

class FakeCache {
  private readonly response: Response;

  constructor(response: Response) {
    this.response = response;
  }

  async match() {
    return this.response.clone();
  }

  async put() {}
}

const station = (overrides: Record<string, unknown> = {}) => ({
  station_no: "500401001",
  name_tw: "清華大學",
  name_en: "NTHU",
  district_tw: "東區",
  district_en: "East Dist",
  address_tw: "清大路",
  address_en: "NTHU Road",
  parking_spaces: 20,
  available_spaces: 8,
  available_spaces_detail: { yb2: 6, eyb: 2 },
  empty_spaces: 12,
  lat: 24.795,
  lng: 120.993,
  status: 1,
  updated_at: "2026-10-10T00:00:00+08:00",
  ...overrides,
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as typeof globalThis & { caches?: unknown }).caches =
    originalCaches;
});

describe("YouBike upstream parser", () => {
  test("preserves the normal station response shape and duplicate rows", () => {
    expect(parseYouBikePayload([station(), station()])).toEqual([
      {
        id: "500401001",
        nameZh: "清華大學",
        nameEn: "NTHU",
        districtZh: "東區",
        districtEn: "East Dist",
        addressZh: "清大路",
        addressEn: "NTHU Road",
        totalCapacity: 20,
        availableBikes: 8,
        regularBikes: 6,
        eBikes: 2,
        emptyDocks: 12,
        lat: 24.795,
        lng: 120.993,
        status: 1,
        updatedAt: "2026-10-10T00:00:00+08:00",
      },
      {
        id: "500401001",
        nameZh: "清華大學",
        nameEn: "NTHU",
        districtZh: "東區",
        districtEn: "East Dist",
        addressZh: "清大路",
        addressEn: "NTHU Road",
        totalCapacity: 20,
        availableBikes: 8,
        regularBikes: 6,
        eBikes: 2,
        emptyDocks: 12,
        lat: 24.795,
        lng: 120.993,
        status: 1,
        updatedAt: "2026-10-10T00:00:00+08:00",
      },
    ]);
  });

  test("preserves empty and unusual station values accepted by HEAD", () => {
    expect(parseYouBikePayload([])).toEqual([]);
    expect(
      parseYouBikePayload([station({ available_spaces: undefined })]),
    ).toEqual([expect.objectContaining({ availableBikes: 0 })]);
    expect(parseYouBikePayload([station({ available_spaces: 21 })])).toEqual([
      expect.objectContaining({ availableBikes: 21 }),
    ]);
  });

  test("accepts the live feed's numeric-string coordinates", () => {
    expect(
      parseYouBikePayload([
        station({ lat: "24.795", lng: "120.993" }),
      ] as unknown[]),
    ).toEqual([expect.objectContaining({ lat: 24.795, lng: 120.993 })]);
  });

  test.each([
    ["5xx", new Response("down", { status: 503 })],
    ["empty body", new Response("")],
    ["HTML error page with 200", new Response("<html>error</html>")],
    ["timeout", new Error("timeout")],
  ])("returns 502 and does not cache %s", async (_label, result) => {
    globalThis.fetch = mock(async () => {
      if (result instanceof Error) throw result;
      return result;
    }) as unknown as typeof fetch;
    const response = await youbike.request("/");
    expect(response.status).toBe(502);
  });

  test("does not serve an invalid old cached snapshot", async () => {
    (globalThis as typeof globalThis & { caches?: unknown }).caches = {
      default: new FakeCache(new Response("not json")),
    };
    let fetchCalls = 0;
    globalThis.fetch = mock(async () => {
      fetchCalls++;
      return new Response("down", { status: 503 });
    }) as unknown as typeof fetch;

    const response = await youbike.request("/");

    expect(response.status).toBe(502);
    expect(fetchCalls).toBe(1);
  });
});
