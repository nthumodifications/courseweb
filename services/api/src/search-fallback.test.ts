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

const createCourseRows = (count: number, semester: string) =>
  Array.from({ length: count }, (_, index) => ({
    ...course,
    raw_id: `${semester}MATH ${String(index).padStart(6, "0")}`,
    course: `MATH${index}`,
    semester,
  }));

type QueryCall = { method: string; args: unknown[] };

let courseRows = [course];
let responseRowCap = Number.POSITIVE_INFINITY;
const courseQueryCalls: QueryCall[] = [];
const rpcQueryCalls: QueryCall[] = [];
const manifestQueryCalls: QueryCall[] = [];
const syllabusSelects: string[] = [];
let rpcError: { message: string; code: string } | null = null;
let manifestError: { message: string; code: string } | null = null;
const defaultManifestRows = [
  { semester: "11420", row_count: 1, max_updated_at: null },
];
let manifestRows = defaultManifestRows;

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
    ilike: mock((column: string, pattern: string) => {
      calls.push({ method: "ilike", args: [column, pattern] });
      const prefix = pattern.endsWith("%")
        ? pattern.slice(0, -1).toLocaleLowerCase()
        : undefined;
      filteredRows = filteredRows.filter((row) => {
        const value = String(
          row[column as keyof typeof course],
        ).toLocaleLowerCase();
        return prefix === undefined
          ? value === pattern.toLocaleLowerCase()
          : value.startsWith(prefix);
      });
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
      return {
        data: filteredRows.slice(from, Math.min(to + 1, from + responseRowCap)),
        error: null,
      };
    }),
  };
  return builder;
};

const supabaseRpc = mock((functionName: string, ...args: unknown[]) => {
  if (functionName === "search_manifest") {
    manifestQueryCalls.push({ method: functionName, args });
    return Promise.resolve({ data: manifestRows, error: manifestError });
  }
  return createCourseQueryBuilder(courseRows, rpcQueryCalls);
});

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
  responseRowCap = Number.POSITIVE_INFINITY;
  courseQueryCalls.length = 0;
  rpcQueryCalls.length = 0;
  manifestQueryCalls.length = 0;
  syllabusSelects.length = 0;
  rpcError = null;
  manifestError = null;
  manifestRows = defaultManifestRows;
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

describe("search fallback semester manifest facet", () => {
  test("uses every manifest semester count without a scan warning", async () => {
    manifestRows = [
      { semester: "11410", row_count: 3, max_updated_at: null },
      { semester: "11510", row_count: 11, max_updated_at: null },
      { semester: "11420", row_count: 7, max_updated_at: null },
    ];
    courseRows = createCourseRows(10_001, "11510");

    const response = await fallbackSearch.fetch(
      new Request(
        "http://localhost/?q=&page=0&hitsPerPage=1&facets=%5B%22semester%22%5D&maxValuesPerFacet=500",
      ),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: {
        facets: { semester: Record<string, number> };
        warnings: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.facets.semester).toEqual({
      "11510": 11,
      "11420": 7,
      "11410": 3,
    });
    expect(manifestQueryCalls).toHaveLength(1);
    expect(payload.data.warnings).not.toContain(
      "Course search reached the 10,000-row scan limit; counts may be incomplete.",
    );
  });

  test.each([
    ["a query", "q=calculus"],
    ["a filter", "filters=department%3AMATH"],
  ] as const)("does not use the manifest for %s", async (_caseName, params) => {
    const response = await fallbackSearch.fetch(
      new Request(
        `http://localhost/?${params}&facets=%5B%22semester%22%5D&maxValuesPerFacet=500`,
      ),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { facets: { semester: Record<string, number> } };
    };

    expect(response.status).toBe(200);
    expect(payload.data.facets.semester).toEqual({ "11420": 1 });
    expect(manifestQueryCalls).toHaveLength(0);
  });

  test("falls back to the scan and keeps its warning when the manifest fails", async () => {
    manifestError = { message: "manifest unavailable", code: "42883" };
    courseRows = createCourseRows(10_001, "11420");
    console.error = () => {};

    const response = await fallbackSearch.fetch(
      new Request(
        "http://localhost/?q=&facets=%5B%22semester%22%5D&maxValuesPerFacet=500",
      ),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: {
        facets: { semester: Record<string, number> };
        warnings: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.facets.semester).toEqual({ "11420": 10_000 });
    expect(payload.data.warnings).toContain(
      "Course search reached the 10,000-row scan limit; counts may be incomplete.",
    );
    expect(manifestQueryCalls).toHaveLength(1);
  });
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

describe("search fallback course-code queries", () => {
  test.each([
    ["cs1355", ["11510CS  135501", "11510CS  135502"]],
    ["CS1355", ["11510CS  135501", "11510CS  135502"]],
    ["EE 2310", ["11510EE  231001"]],
    ["CS135500", ["11510CS  135501", "11510CS  135502"]],
    ["calculus", ["11420MATH 101000"]],
  ] as const)("matches %s with the database search", async (query, rawIds) => {
    courseRows = [
      {
        ...course,
        raw_id: "11510CS  135501",
        course: "1355",
        department: "CS",
        semester: "11510",
        name_en: "Computer Science I",
      },
      {
        ...course,
        raw_id: "11510CS  135502",
        course: "1355",
        department: "CS",
        semester: "11510",
        name_en: "Computer Science I",
      },
      {
        ...course,
        raw_id: "11510EE  231001",
        course: "2310",
        department: "EE",
        semester: "11510",
        name_en: "Signals and Systems",
      },
    ];
    courseRows.push(course);

    const response = await fallbackSearch.fetch(
      new Request(`http://localhost/?q=${encodeURIComponent(query)}`),
      {
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "test",
      },
    );
    const payload = (await response.json()) as {
      data: { hits: Array<{ raw_id: string }>; nbHits: number };
    };

    expect(response.status).toBe(200);
    expect(payload.data.nbHits).toBe(rawIds.length);
    expect(payload.data.hits.map((hit) => hit.raw_id)).toEqual(
      [...rawIds].sort((left, right) => right.localeCompare(left)),
    );
    if (query !== "calculus") {
      expect(rpcQueryCalls).toEqual([]);
      expect(courseQueryCalls).toContainEqual({
        method: "eq",
        args: ["department", query.replace(/\s|\d/g, "").toLocaleUpperCase()],
      });
    }
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

  test.each([
    ["table", ""],
    ["RPC", "calculus"],
  ] as const)(
    "pages through a response-capped %s scan without truncating",
    async (_source, query) => {
      responseRowCap = 4_000;
      courseRows = Array.from({ length: 4_899 }, (_, index) => ({
        ...course,
        raw_id: `10810MATH ${String(index).padStart(6, "0")}`,
        course: `MATH${index}`,
        name_en: query ? "Calculus" : "New course",
        semester: "10810",
      }));

      const response = await fallbackSearch.fetch(
        new Request(
          `http://localhost/?q=${query}&facetFilters=semester%3A10810`,
        ),
        {
          SUPABASE_URL: "https://supabase.example",
          SUPABASE_SERVICE_ROLE_KEY: "test",
        },
      );
      const payload = (await response.json()) as {
        data: { nbHits: number; warnings: string[] };
      };
      const calls = query ? rpcQueryCalls : courseQueryCalls;

      expect(response.status).toBe(200);
      expect(payload.data.nbHits).toBe(4_899);
      expect(payload.data.warnings).not.toContain(
        "Course search reached the 10,000-row scan limit; counts may be incomplete.",
      );
      expect(
        calls
          .filter((call) => call.method === "range")
          .map((call) => call.args),
      ).toEqual([
        [0, 999],
        [1_000, 1_999],
        [2_000, 2_999],
        [3_000, 3_999],
        [4_000, 4_999],
      ]);
      expect(calls.filter((call) => call.method === "order")).toHaveLength(5);
      expect(
        calls.filter(
          (call) =>
            call.method === "eq" &&
            (call.args as [string, string])[0] === "semester",
        ),
      ).toHaveLength(5);
    },
  );

  test("warns when the bounded database scan reaches its limit", async () => {
    responseRowCap = 4_000;
    courseRows = Array.from({ length: 10_001 }, (_, index) => ({
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
