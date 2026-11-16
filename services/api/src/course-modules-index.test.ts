import { beforeEach, describe, expect, it, mock } from "bun:test";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

type CourseIndexRow = {
  semester: string;
  department: string;
  course: string;
  name_zh: string;
  name_en: string;
  credits: number;
  language: string | null;
  teacher_zh: string[] | null;
  teacher_en: string[] | null;
  capacity: number | null;
  enrolled: number | null;
};

const rows: CourseIndexRow[] = [];
const pageCalls: [number, number][] = [];
const selectCalls: string[] = [];
let cacheKeyUrl = "";
let cacheWrites = 0;

const makeSupabaseClient = () => ({
  from: (table: string) => ({
    select: (columns: string, options?: { count?: string; head?: boolean }) => {
      selectCalls.push(columns);
      const query = {
        order: (_column: string, _options: { ascending: boolean }) => query,
        range: async (from: number, to: number) => {
          pageCalls.push([from, to]);
          return { data: rows.slice(from, to + 1), error: null };
        },
        then: (
          resolve: (value: { count: number; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) =>
          Promise.resolve({ count: rows.length, error: null }).then(
            resolve,
            reject,
          ),
      };
      if (table !== "courses") {
        throw new Error("Unexpected module index query");
      }
      void options;
      return query;
    },
  }),
});

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => makeSupabaseClient()),
);

const { default: course, getModuleIndexCacheKey } = await import("./course");

beforeEach(() => {
  rows.length = 0;
  pageCalls.length = 0;
  selectCalls.length = 0;
  cacheKeyUrl = "";
  cacheWrites = 0;
});

const makeRow = (index: number): CourseIndexRow => ({
  semester: "11510",
  department: "CS",
  course: String(1000 + index),
  name_zh: `課程 ${index}`,
  name_en: `Course ${index}`,
  credits: 3,
  language: "英",
  teacher_zh: ["王老師"],
  teacher_en: ["Wang"],
  capacity: 40,
  enrolled: 20,
});

describe("GET /course/modules-index", () => {
  it("reads all Supabase pages and returns a compact cached index", async () => {
    rows.push(...Array.from({ length: 1_001 }, (_, index) => makeRow(index)));
    const oldCaches = Object.getOwnPropertyDescriptor(globalThis, "caches");
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: {
        default: {
          match: async (request: Request) => {
            cacheKeyUrl = request.url;
            return undefined;
          },
          put: async (request: Request) => {
            cacheKeyUrl = request.url;
            cacheWrites += 1;
          },
        },
      },
    });

    try {
      const response = await course.request("/modules-index");
      const payload = (await response.json()) as {
        v: number;
        d: string[];
        t: [number, number][];
        r: unknown[][];
      };

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
      );
      expect(payload.v).toBe(1);
      expect(payload.d).toEqual(["CS"]);
      expect(payload.t).toHaveLength(1);
      expect(payload.r).toHaveLength(1_001);
      expect(pageCalls).toEqual([
        [0, 999],
        [1_000, 1_999],
      ]);
      expect(selectCalls[0]).toBe("raw_id");
      expect(selectCalls[1]).toBe(
        "semester, department, course, name_zh, name_en, credits, language, teacher_zh, teacher_en, capacity, enrolled",
      );
      expect(cacheKeyUrl).toBe("https://api.nthumods.com/course/modules-index");
      expect(cacheWrites).toBe(1);
    } finally {
      if (oldCaches) {
        Object.defineProperty(globalThis, "caches", oldCaches);
      } else {
        delete (globalThis as typeof globalThis & { caches?: CacheStorage })
          .caches;
      }
    }
  });

  it("uses a fixed Cache API key, independent of request URLs", () => {
    expect(getModuleIndexCacheKey().url).toBe(
      "https://api.nthumods.com/course/modules-index",
    );
  });
});
