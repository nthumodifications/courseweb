import { afterEach, describe, expect, mock, test } from "bun:test";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

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

type QueryCall = { method: string; args: unknown[] };

let courseRows = [course];
const courseQueryCalls: QueryCall[] = [];
const rpcQueryCalls: QueryCall[] = [];
const syllabusSelects: string[] = [];
let rpcError: { message: string; code: string } | null = null;

const createCourseQueryBuilder = (
  rows: (typeof course)[],
  calls: QueryCall[],
) => {
  let filteredRows = [...rows];
  const builder = {
    select: mock(() => builder),
    or: mock((...args: unknown[]) => {
      calls.push({ method: "or", args });
      return builder;
    }),
    eq: mock((column: string, value: string) => {
      calls.push({ method: "eq", args: [column, value] });
      filteredRows = filteredRows.filter(
        (row) => row[column as "semester"] === value,
      );
      return builder;
    }),
    in: mock((column: string, values: string[]) => {
      calls.push({ method: "in", args: [column, values] });
      filteredRows = filteredRows.filter((row) =>
        values.includes(row[column as "semester"]),
      );
      return builder;
    }),
    order: mock((...args: unknown[]) => {
      calls.push({ method: "order", args });
      return builder;
    }),
    range: mock(async (...args: unknown[]) => {
      calls.push({ method: "range", args });
      if (calls === rpcQueryCalls && rpcError) {
        return { data: null, error: rpcError };
      }
      const [from, to] = args as [number, number];
      return { data: filteredRows.slice(from, to + 1), error: null };
    }),
  };
  return builder;
};

const supabaseRpc = mock(() =>
  createCourseQueryBuilder(courseRows, rpcQueryCalls),
);

const syllabusIn = mock(async (_column: string, rawIds: string[]) => ({
  data: rawIds.includes(course.raw_id)
    ? [
        {
          raw_id: course.raw_id,
          brief: "Limits, derivatives and integrals.",
          keywords: ["calculus", "analysis"],
          content: "Limits, derivatives and integrals in detail.",
        },
      ]
    : [],
  error: null,
}));

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => ({
    rpc: supabaseRpc,
    from: (table: string) => {
      if (table === "courses") {
        return createCourseQueryBuilder(courseRows, courseQueryCalls);
      }
      if (table !== "course_syllabus") throw new Error(`unexpected ${table}`);
      return {
        select: (columns: string) => {
          syllabusSelects.push(columns);
          return { in: syllabusIn };
        },
      };
    },
  })),
);

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

const requestBooleanFilter = (filters: string) =>
  fallbackSearch.fetch(
    new Request(`http://localhost/?q=calculus&filters=${filters}`),
    {
      SUPABASE_URL: "https://supabase.example",
      SUPABASE_SERVICE_ROLE_KEY: "test",
    },
  );

afterEach(() => {
  courseRows = [course];
  courseQueryCalls.length = 0;
  rpcQueryCalls.length = 0;
  syllabusSelects.length = 0;
  rpcError = null;
  console.error = originalConsoleError;
});

const originalConsoleError = console.error;

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
  test.each([
    ["by default", "", false],
    [
      "when content is explicitly requested",
      `&attributesToRetrieve=${encodeURIComponent(JSON.stringify(["content"]))}`,
      true,
    ],
  ] as const)(
    "returns syllabus text %s without over-selecting content",
    async (_caseName, attributes, includesContent) => {
      const response = await fallbackSearch.fetch(
        new Request(`http://localhost/?q=calculus&hitsPerPage=20${attributes}`),
        {
          SUPABASE_URL: "https://supabase.example",
          SUPABASE_SERVICE_ROLE_KEY: "test",
        },
      );
      const payload = (await response.json()) as {
        data: { hits: Array<Record<string, unknown>> };
      };

      expect(response.status).toBe(200);
      expect(syllabusSelects).toEqual([
        includesContent
          ? "raw_id,brief,keywords,content"
          : "raw_id,brief,keywords",
      ]);
      if (includesContent) {
        expect(payload.data.hits[0]).toEqual({
          objectID: course.raw_id,
          content: "Limits, derivatives and integrals in detail.",
        });
      } else {
        expect(payload.data.hits[0]).toMatchObject({
          raw_id: course.raw_id,
          brief: "Limits, derivatives and integrals.",
          keywords: ["calculus", "analysis"],
        });
        expect(payload.data.hits[0]).not.toHaveProperty("content");
      }
    },
  );
});

describe("search fallback facet-value refinements", () => {
  test("ignores the requested facet group while retaining semester push-down", async () => {
    courseRows = [
      course,
      {
        ...course,
        raw_id: "11420CS 101000",
        course: "CS101",
        department: "CS",
      },
    ];
    const facetFilters = encodeURIComponent(
      JSON.stringify([["department:CS"], ["semester:11420"]]),
    );
    const response = await fallbackSearch.fetch(
      new Request(
        `http://localhost/?facetName=department&facetQuery=&facetFilters=${facetFilters}`,
      ),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { facetHits: Array<{ value: string }> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.facetHits.map((hit) => hit.value)).toEqual(
      expect.arrayContaining(["CS", "MATH"]),
    );
    expect(courseQueryCalls).toContainEqual({
      method: "eq",
      args: ["semester", "11420"],
    });
  });

  test("does not push the requested semester facet into the database", async () => {
    courseRows = [
      course,
      {
        ...course,
        raw_id: "11510CS 101000",
        course: "CS101",
        semester: "11510",
      },
    ];
    const facetFilters = encodeURIComponent(
      JSON.stringify([["semester:11420"]]),
    );
    const response = await fallbackSearch.fetch(
      new Request(
        `http://localhost/?facetName=semester&facetQuery=&facetFilters=${facetFilters}`,
      ),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { facetHits: Array<{ value: string }> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.facetHits.map((hit) => hit.value)).toEqual(
      expect.arrayContaining(["11420", "11510"]),
    );
    expect(
      courseQueryCalls.some((call) => ["eq", "in"].includes(call.method)),
    ).toBe(false);
  });
});

describe("search fallback RPC degradation", () => {
  test("warns and logs when instructor matching falls back to scalar fields", async () => {
    rpcError = { message: "function is unavailable", code: "42883" };
    const logs: unknown[][] = [];
    console.error = (...args: unknown[]) => logs.push(args);

    const response = await fallbackSearch.fetch(
      new Request("http://localhost/?q=calculus"),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { warnings: string[] };
    };

    expect(response.status).toBe(200);
    expect(payload.data.warnings).toContain("Instructor matching unavailable");
    expect(logs).toContainEqual([
      "search_courses RPC failed, using ilike fallback:",
      { message: "function is unavailable", code: "42883" },
    ]);
  });
});

describe("search fallback boolean filters", () => {
  test.each([
    [
      "keeps either branch of an OR filter",
      "department%3ACS%20OR%20department%3AMATH",
    ],
    [
      "keeps OR separators case-insensitive across whitespace",
      "department%3ACS%09or%0Adepartment%3AMATH",
    ],
  ])("%s", async (_name, filters) => {
    const response = await requestBooleanFilter(filters);
    const payload = (await response.json()) as {
      data: { hits: Array<Record<string, unknown>>; nbHits: number };
    };

    expect(response.status).toBe(200);
    expect(payload.data.nbHits).toBe(1);
    expect(payload.data.hits[0]?.raw_id).toBe(course.raw_id);
  });
});

describe("search fallback database semester filters", () => {
  test("pushes a semester facet into PostgREST before range", async () => {
    const response = await fallbackSearch.fetch(
      new Request("http://localhost/?facetFilters=semester%3A11420"),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );

    expect(response.status).toBe(200);
    const eqIndex = courseQueryCalls.findIndex((call) => call.method === "eq");
    const rangeIndex = courseQueryCalls.findIndex(
      (call) => call.method === "range",
    );
    expect(courseQueryCalls[eqIndex]).toEqual({
      method: "eq",
      args: ["semester", "11420"],
    });
    expect(eqIndex).toBeGreaterThanOrEqual(0);
    expect(eqIndex).toBeLessThan(rangeIndex);
  });

  test("pushes an OR semester facet group with in before range", async () => {
    const facetFilters = encodeURIComponent(
      JSON.stringify([["semester:11420", "semester:11410"]]),
    );
    const response = await fallbackSearch.fetch(
      new Request(`http://localhost/?facetFilters=${facetFilters}`),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );

    expect(response.status).toBe(200);
    const inIndex = courseQueryCalls.findIndex((call) => call.method === "in");
    const rangeIndex = courseQueryCalls.findIndex(
      (call) => call.method === "range",
    );
    expect(courseQueryCalls[inIndex]).toEqual({
      method: "in",
      args: ["semester", ["11420", "11410"]],
    });
    expect(inIndex).toBeLessThan(rangeIndex);
  });

  test("pushes a semester filter into the RPC result before range", async () => {
    const response = await fallbackSearch.fetch(
      new Request("http://localhost/?q=calculus&filters=semester%3A11420"),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );

    expect(response.status).toBe(200);
    const eqIndex = rpcQueryCalls.findIndex((call) => call.method === "eq");
    const rangeIndex = rpcQueryCalls.findIndex(
      (call) => call.method === "range",
    );
    expect(rpcQueryCalls[eqIndex]).toEqual({
      method: "eq",
      args: ["semester", "11420"],
    });
    expect(eqIndex).toBeLessThan(rangeIndex);
  });

  test("does not add a semester restriction when none was requested", async () => {
    const response = await fallbackSearch.fetch(
      new Request("http://localhost/?q=calculus&filters=department%3AMATH"),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );

    expect(response.status).toBe(200);
    expect(
      rpcQueryCalls.some((call) => ["eq", "in"].includes(call.method)),
    ).toBe(false);
  });

  test("finds an old semester beyond the newest 10,000 rows", async () => {
    const newestRows = Array.from({ length: 10_000 }, (_, index) => ({
      ...course,
      raw_id: `11510MATH ${String(index).padStart(6, "0")}`,
      course: `MATH${index}`,
      name_en: "New course",
      semester: "11510",
    }));
    const oldCourse = {
      ...course,
      raw_id: "11420MATH 101000",
      semester: "11420",
    };
    courseRows = [...newestRows, oldCourse];

    const response = await fallbackSearch.fetch(
      new Request("http://localhost/?facetFilters=semester%3A11420"),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { hits: Array<Record<string, unknown>>; nbHits: number };
    };

    expect(response.status).toBe(200);
    expect(payload.data.nbHits).toBe(1);
    expect(payload.data.hits[0]?.raw_id).toBe(oldCourse.raw_id);
  });

  test("warns when the bounded database scan reaches its limit", async () => {
    courseRows = Array.from({ length: 10_000 }, (_, index) => ({
      ...course,
      raw_id: `11420MATH ${String(index).padStart(6, "0")}`,
    }));

    const response = await fallbackSearch.fetch(
      new Request("http://localhost/"),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { warnings: string[] };
    };

    expect(response.status).toBe(200);
    expect(payload.data.warnings).toContain(
      "Course search reached the 10,000-row scan limit; counts may be incomplete.",
    );
  });
});
