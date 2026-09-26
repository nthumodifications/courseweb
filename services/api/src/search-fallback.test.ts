import { describe, expect, mock, test } from "bun:test";

const course = {
  raw_id: "11420MATH 101000",
  course: "MATH101",
  name_zh: "微積分",
  name_en: "Calculus",
  department: "MATH",
  teacher_zh: [],
  teacher_en: [],
  times: [],
  elective_for: [],
  compulsory_for: [],
  semester: "11420",
  language: "English",
  ge_target: [],
  ge_type: [],
  tags: [],
  venues: [],
  first_specialization: [],
  second_specialization: [],
  cross_discipline: false,
  credits: 3,
};

const supabaseRpc = mock(() => ({
  order: () => ({
    range: async () => ({ data: [course], error: null }),
  }),
}));

const syllabusIn = mock(async (_column: string, rawIds: string[]) => ({
  data: rawIds.includes(course.raw_id)
    ? [
        {
          raw_id: course.raw_id,
          brief: "Limits, derivatives and integrals.",
          keywords: ["calculus", "analysis"],
        },
      ]
    : [],
  error: null,
}));

mock.module("./config/supabase_server", () => ({
  default: () => ({
    rpc: supabaseRpc,
    from: (table: string) => {
      if (table !== "course_syllabus") throw new Error(`unexpected ${table}`);
      return { select: () => ({ in: syllabusIn }) };
    },
  }),
}));

const { default: fallbackSearch } = await import("./search-fallback");

const requestFallback = (parameter: "hitsPerPage" | "limit") =>
  fallbackSearch.fetch(
    new Request(
      `http://localhost/?q=calculus&${parameter}=0&facets=%5B%22semester%22%5D&maxValuesPerFacet=500`,
    ),
    {
      SUPABASE_URL: "https://supabase.example",
      SUPABASE_SERVICE_ROLE_KEY: "test",
    },
  );

describe("search fallback zero-hit pagination", () => {
  test.each(["hitsPerPage", "limit"] as const)(
    "accepts %s=0 while still returning facets",
    async (parameter) => {
      const response = await requestFallback(parameter);
      const payload = (await response.json()) as {
        success: boolean;
        data: {
          hits: unknown[];
          hitsPerPage: number;
          nbHits: number;
          nbPages: number;
          facets: { semester: Record<string, number> };
        };
      };

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.hits).toEqual([]);
      expect(payload.data.hitsPerPage).toBe(0);
      expect(payload.data.nbHits).toBe(1);
      expect(payload.data.nbPages).toBe(0);
      expect(payload.data.facets.semester["11420"]).toBe(1);
    },
  );
});

describe("search fallback syllabus text", () => {
  test("returns brief and keywords from course_syllabus on each hit", async () => {
    const response = await fallbackSearch.fetch(
      new Request("http://localhost/?q=calculus&hitsPerPage=20"),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { hits: Array<Record<string, unknown>> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.hits[0]).toMatchObject({
      raw_id: course.raw_id,
      brief: "Limits, derivatives and integrals.",
      keywords: ["calculus", "analysis"],
    });
  });
});
