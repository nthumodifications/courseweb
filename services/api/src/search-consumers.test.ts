import { describe, expect, it, mock } from "bun:test";
import type { Context } from "hono";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

const course = {
  raw_id: "11510CS 535100",
  course: "CS535100",
  name_zh: "機器學習",
  name_en: "Machine Learning",
  department: "CS",
  class: "A",
  teacher_zh: [],
  teacher_en: [],
  times: ["A1A2"],
  elective_for: [],
  compulsory_for: [],
  semester: "11510",
  language: "English",
  ge_target: null,
  ge_type: null,
  tags: [],
  venues: [],
  first_specialization: [],
  second_specialization: [],
  cross_discipline: [],
  credits: 3,
  restrictions: null,
  note: null,
  prerequisites: null,
  capacity: 60,
  enrolled: 50,
  closed_mark: null,
};

const supabaseRpc = mock(() => {
  const builder = {
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    range: async () => ({ data: [course], error: null }),
  };
  return builder;
});

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => ({
    rpc: supabaseRpc,
    from: (table: string) => {
      if (table !== "course_syllabus") throw new Error(`unexpected ${table}`);
      return {
        select: () => ({
          in: async () => ({
            data: [
              {
                raw_id: course.raw_id,
                brief: "A course about statistical learning.",
                keywords: ["machine learning"],
              },
            ],
            error: null,
          }),
        }),
      };
    },
  })),
);

const { default: mcpServer } = await import("./mcp-server");
const { executeTool } = await import("./chat/tools");

const env = {
  SUPABASE_URL: "https://supabase.example",
  SUPABASE_SERVICE_ROLE_KEY: "test",
};

const postMcp = (body: unknown) =>
  mcpServer.request(
    "/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );

describe("Supabase-backed search consumers", () => {
  it("serves MCP search tools with department, language, and semester filters", async () => {
    const singleResponse = await postMcp({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "search_courses",
        arguments: { query: "machine learning", limit: 5 },
      },
      id: 1,
    });
    const singlePayload = await singleResponse.json();
    const singleResult = JSON.parse(singlePayload.result.content[0].text);

    expect(singleResult.total).toBe(1);
    expect(singleResult.courses[0].raw_id).toBe(course.raw_id);

    const response = await postMcp({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "bulk_search_courses",
        arguments: {
          queries: ["machine learning"],
          limit: 5,
          filters: { department: "CS", language: "English", semester: "11510" },
        },
      },
      id: 1,
    });
    const payload = await response.json();
    const result = JSON.parse(payload.result.content[0].text);

    expect(response.status).toBe(200);
    expect(result.filters_applied).toEqual({
      department: "CS",
      language: "English",
      semester: "11510",
    });
    expect(result.results[0].total).toBe(1);
    expect(result.results[0].courses[0].raw_id).toBe(course.raw_id);
  });

  it("serves chat course comparisons through the shared search", async () => {
    const result = await executeTool(
      { env } as unknown as Context,
      "compare_courses",
      {
        queries: "machine learning",
        department: "CS",
        semester: "11510",
      },
    );

    expect(result).toMatchObject({
      semester: "11510",
      filters_applied: { department: "CS" },
      results: [
        {
          total: 1,
          courses: [{ raw_id: course.raw_id }],
        },
      ],
    });
  });
});
