import { describe, expect, it, mock } from "bun:test";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

const courses = [
  {
    raw_id: "11510CS 535100",
    course: "CS535100",
    name_zh: "機器學習",
    name_en: "Machine Learning",
    department: "CS",
    class: "A",
    teacher_zh: ["甲老師"],
    teacher_en: ["A Teacher"],
    times: ["A1A2"],
    elective_for: [],
    compulsory_for: [],
    semester: "11510",
    language: "English",
    ge_target: null,
    ge_type: null,
    tags: [],
    venues: ["EECS 101"],
    first_specialization: [],
    second_specialization: [],
    cross_discipline: [],
    credits: 3,
    capacity: 60,
    reserve: null,
    enrolled: 50,
    closed_mark: null,
    restrictions: null,
    note: null,
    prerequisites: null,
    updated_at: "2026-10-01T00:00:00Z",
    no_extra_selection: false,
    time_slots: ["A1", "A2"],
  },
  {
    raw_id: "11420MATH 535100",
    course: "MATH535100",
    name_zh: "機器學習",
    name_en: "Machine Learning",
    department: "MATH",
    class: "A",
    teacher_zh: ["乙老師"],
    teacher_en: ["B Teacher"],
    times: ["B1B2"],
    elective_for: [],
    compulsory_for: [],
    semester: "11420",
    language: "English",
    ge_target: null,
    ge_type: null,
    tags: [],
    venues: ["MATH 201"],
    first_specialization: [],
    second_specialization: [],
    cross_discipline: [],
    credits: 3,
    capacity: 40,
    reserve: null,
    enrolled: 30,
    closed_mark: null,
    restrictions: null,
    note: null,
    prerequisites: null,
    updated_at: "2026-09-01T00:00:00Z",
    no_extra_selection: false,
    time_slots: ["B1", "B2"],
  },
];

const supabaseRpc = mock(() => ({
  order: () => ({
    range: async () => ({ data: courses, error: null }),
  }),
}));

const syllabusIn = mock(async (_column: string, rawIds: string[]) => ({
  data: rawIds.map((raw_id) => ({
    raw_id,
    brief: "A course about statistical learning.",
    keywords: ["machine learning"],
  })),
  error: null,
}));

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => ({
    rpc: supabaseRpc,
    from: (table: string) => {
      if (table !== "course_syllabus") throw new Error(`unexpected ${table}`);
      return { select: () => ({ in: syllabusIn }) };
    },
  })),
);

const { default: search } = await import("./search");

const env = {
  SUPABASE_URL: "https://supabase.example",
  SUPABASE_SERVICE_ROLE_KEY: "test",
};

const postSearch = (body: Record<string, unknown>) =>
  search.request(
    "/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );

describe("search input controls", () => {
  it("rejects queries longer than 200 characters", async () => {
    const response = await postSearch({ query: "x".repeat(201) });

    expect(response.status).toBe(400);
  });

  it("rejects attributes outside the course projection", async () => {
    const response = await postSearch({
      query: "machine learning",
      attributesToRetrieve: ["service_role_key"],
    });

    expect(response.status).toBe(400);
  });

  it("accepts the two supported highlight pairs only", async () => {
    const response = await postSearch({
      query: "machine learning",
      highlightPreTag: "<strong>",
      highlightPostTag: "</strong>",
    });

    expect(response.status).toBe(400);
  });

  it("rejects unknown filter and facet attributes", async () => {
    const filterResponse = await postSearch({
      query: "machine learning",
      filters: "secret_field:exposed",
    });
    const facetResponse = await postSearch({
      query: "machine learning",
      facetFilters: ["secret_field:exposed"],
    });

    expect(filterResponse.status).toBe(400);
    expect(facetResponse.status).toBe(400);
  });

  it("bounds filters, facet filters, and result limits", async () => {
    const longFilter = await postSearch({
      query: "machine learning",
      filters: "department:CS".repeat(40),
    });
    const tooManyFacets = await postSearch({
      query: "machine learning",
      facetFilters: Array.from({ length: 21 }, () => "department:CS"),
    });
    const tooManyResults = await postSearch({
      query: "machine learning",
      limit: 51,
    });

    expect(longFilter.status).toBe(400);
    expect(tooManyFacets.status).toBe(400);
    expect(tooManyResults.status).toBe(400);
  });

  it("applies the same allowlist to GET parameters", async () => {
    const response = await search.request(
      "/?q=machine%20learning&attributesToRetrieve=unknown_field",
      {},
      env,
    );

    expect(response.status).toBe(400);
  });
});

describe("Supabase-backed public search", () => {
  it("serves POST searches with filters through the shared query", async () => {
    const response = await postSearch({
      query: "machine learning",
      limit: 10,
      filters: "department:CS",
      facetFilters: ["language:English"],
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.nbHits).toBe(1);
    expect(payload.data.hits).toHaveLength(1);
    expect(payload.data.hits[0]).toMatchObject({
      raw_id: "11510CS 535100",
      objectID: "11510CS 535100",
      brief: "A course about statistical learning.",
    });
    expect(payload.data.hits[0].updated_at).toBeUndefined();
    expect(payload.data.params).toBe("");
  });

  it("keeps pagination fields on GET searches", async () => {
    const response = await search.request(
      "/?q=machine%20learning&limit=1",
      {},
      env,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.nbHits).toBe(2);
    expect(payload.data.page).toBe(0);
    expect(payload.data.hitsPerPage).toBe(1);
    expect(payload.data.nbPages).toBe(2);
    expect(payload.data.hits).toHaveLength(1);
    expect(payload.data.params).toBeUndefined();
  });
});
