import { afterEach, describe, expect, mock, test } from "bun:test";
import fixture from "./directory.fixture.json";
import {
  createDirectoryApp,
  DIRECTORY_SOURCE,
  normalizeDirectory,
} from "./directory";

afterEach(() => mock.restore());

describe("directory normalization", () => {
  test("keeps department contacts but removes individual people", () => {
    expect(normalizeDirectory(fixture)).toEqual([
      {
        id: "01",
        name: "校長室",
        parentName: null,
        url: "https://tel.net.nthu.edu.tw/nthusearch/dept.php?dd=01",
        phone: "03-5162001",
        extension: "62001",
        email: "presid@my.nthu.edu.tw",
        website: "http://president.site.nthu.edu.tw/?Lang=zh-tw",
      },
      {
        id: "04",
        name: "呂副校長室",
        parentName: null,
        url: "https://tel.net.nthu.edu.tw/nthusearch/dept.php?dd=04",
        phone: "03-5162473",
        extension: "62473",
        email: null,
        website:
          "https://president.site.nthu.edu.tw/p/404-1067-232761.php?Lang=zh-tw",
      },
    ]);
  });

  test("rejects a non-array upstream payload", () => {
    expect(() => normalizeDirectory({ error: "upstream down" })).toThrow();
  });
});

describe("directory route", () => {
  test("validates, attributes, and caches a successful response", async () => {
    const fetchMock = mock(async () => Response.json(fixture));
    let cacheWrites = 0;
    const cache = {
      match: async () => undefined,
      put: async () => {
        cacheWrites += 1;
      },
    } as unknown as Cache;
    const app = createDirectoryApp(fetchMock as unknown as typeof fetch, cache);

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=900");
    expect(await response.json()).toEqual({
      data: normalizeDirectory(fixture),
      source: DIRECTORY_SOURCE,
      error: false,
    });
    expect(cacheWrites).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.nthusa.tw/directory",
    );
  });

  test("returns an empty flagged response when upstream fails", async () => {
    const app = createDirectoryApp(
      mock(async () => {
        throw new Error("network failure");
      }) as unknown as typeof fetch,
      undefined,
    );

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      source: DIRECTORY_SOURCE,
      error: true,
    });
  });
});
