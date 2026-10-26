import { afterEach, describe, expect, mock, test } from "bun:test";
import fixture from "./lost-and-found.fixture.json";
import {
  createLibrariesApp,
  getLostAndFoundType,
  LOST_AND_FOUND_SOURCE,
  normalizeLostAndFound,
} from "./libraries";

afterEach(() => mock.restore());

describe("lost-and-found normalization", () => {
  test("normalizes the live Chinese-keyed records and derives item types", () => {
    expect(normalizeLostAndFound(fixture)).toEqual([
      {
        id: "1",
        date: "2026-10-22",
        location: "總圖 1F",
        description: "其它卡片 白色 悠遊卡 Usagyuuun!!!聯名 系統編號為 34608",
        type: "其它卡片",
      },
      {
        id: "2",
        date: "2026-10-22",
        location: "總圖 5F",
        description: "水壺 深灰色 很多貼紙 系統編號為 34606",
        type: "水壺",
      },
      {
        id: "3",
        date: "2026-10-21",
        location: "總圖 1F",
        description: "髮捲 粉色 系統編號為 34603",
        type: "髮捲",
      },
    ]);
    expect(getLostAndFoundType("  手機 白色")).toBe("手機");
  });

  test("keeps valid records when another item is malformed", () => {
    expect(
      normalizeLostAndFound([
        fixture[0],
        { ...fixture[1], 拾獲時間: "yesterday" },
      ]),
    ).toEqual(normalizeLostAndFound([fixture[0]]));
  });

  test("rejects a non-array upstream payload", () => {
    expect(() => normalizeLostAndFound({ error: "upstream down" })).toThrow();
  });
});

describe("lost-and-found route", () => {
  test("proxies the endpoint with cache headers and source attribution", async () => {
    const fetchMock = mock(async () => Response.json(fixture));
    const app = createLibrariesApp(
      fetchMock as unknown as typeof fetch,
      undefined,
    );

    const response = await app.request("/lost-and-found");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=900");
    expect(await response.json()).toEqual({
      data: normalizeLostAndFound(fixture),
      source: LOST_AND_FOUND_SOURCE,
      error: false,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.nthusa.tw/libraries/lost-and-found",
    );
  });

  test("returns an empty flagged response when validation fails", async () => {
    const app = createLibrariesApp(
      mock(async () =>
        Response.json({ error: "upstream down" }),
      ) as unknown as typeof fetch,
      undefined,
    );

    const response = await app.request("/lost-and-found");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      source: LOST_AND_FOUND_SOURCE,
      error: true,
    });
  });
});
