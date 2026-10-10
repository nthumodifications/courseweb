import { Hono } from "hono";
import type { Context, Next } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import algolia from "./config/algolia";
import supabase_server from "./config/supabase_server";
import type { Bindings } from "./index";
import { rateLimitMiddleware } from "./utils/rate-limit";
import {
  eligibilitySummary,
  type EligibilityLevel,
  type StudentForEligibility,
} from "./course-eligibility";

const MAX_MCP_BODY_BYTES = 64 * 1024;
const MAX_QUERY_LENGTH = 200;
const MAX_COURSE_ID_LENGTH = 100;
const MAX_COURSE_IDS = 50;

// Carries only our own validation text (argument path and rule), never
// upstream output, so it is safe to return to the caller.
class InvalidParamsError extends Error {
  constructor(detail: string) {
    super(`Invalid parameters: ${detail}`);
  }
}

const parseToolArgs = <Schema extends z.ZodTypeAny>(
  schema: Schema,
  args: unknown,
): z.infer<Schema> => {
  const result = schema.safeParse(args);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new InvalidParamsError(
      `${issue.path.join(".") || "arguments"}: ${issue.message}`,
    );
  }
  return result.data;
};

const searchCoursesArgsSchema = z.object({
  query: z.string().min(1).max(MAX_QUERY_LENGTH),
  limit: z.number().int().min(1).optional().default(10),
  level: z.string().max(80).optional(),
  year: z.number().int().min(1).max(10).optional(),
  unit: z.string().max(120).optional(),
});

const courseIdArgsSchema = z.object({
  courseId: z.string().min(1).max(MAX_COURSE_ID_LENGTH),
});

const multipleCoursesArgsSchema = z.object({
  courseIds: z
    .array(z.string().min(1).max(MAX_COURSE_ID_LENGTH))
    .min(1)
    .max(MAX_COURSE_IDS),
});

const bulkSearchArgsSchema = z.object({
  queries: z.array(z.string().min(1).max(MAX_QUERY_LENGTH)).min(1).max(5),
  limit: z.number().int().min(1).optional().default(5),
  filters: z
    .object({
      department: z.string().max(100).optional(),
      language: z.string().max(100).optional(),
      semester: z.string().max(100).optional(),
      level: z.string().max(80).optional(),
      year: z.number().int().min(1).max(10).optional(),
      unit: z.string().max(120).optional(),
    })
    .optional()
    .default({}),
});

const studentFromFilters = (filters: {
  level?: string;
  year?: number;
  unit?: string;
}): StudentForEligibility | undefined => {
  if (
    typeof filters.level !== "string" &&
    typeof filters.year !== "number" &&
    typeof filters.unit !== "string"
  )
    return undefined;
  return {
    level: filters.level as EligibilityLevel | undefined,
    year: filters.year,
    unit: filters.unit,
  };
};

const includeEligibility = (
  course: Record<string, unknown>,
  student?: StudentForEligibility,
) => ({
  ...course,
  eligibility: eligibilitySummary(
    typeof course.restrictions === "string" ? course.restrictions : undefined,
    student,
  ),
});

const toMcpCourseSummary = (
  hit: Record<string, any>,
  student?: StudentForEligibility,
) =>
  includeEligibility(
    {
      raw_id: hit.raw_id,
      course: hit.course,
      department: hit.department,
      class: hit.class,
      name_zh: hit.name_zh,
      name_en: hit.name_en,
      teacher_zh: hit.teacher_zh || [],
      teacher_en: hit.teacher_en || [],
      credits: hit.credits,
      times: hit.times || [],
      venues: hit.venues || [],
      language: hit.language,
      semester: hit.semester,
      brief: hit.brief,
      restrictions: hit.restrictions,
      note: hit.note,
      prerequisites: hit.prerequisites,
      capacity: hit.capacity,
      cross_discipline: hit.cross_discipline || [],
      ge_type: hit.ge_type,
    },
    student,
  );

const rejectOversizedBody = async (
  c: Context<{ Bindings: Bindings }>,
  next: Next,
) => {
  const contentLength = Number(c.req.header("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MCP_BODY_BYTES) {
    return c.json({
      jsonrpc: "2.0",
      error: { code: -32602, message: "Invalid parameters" },
      id: null,
    });
  }

  const body = await c.req.raw.clone().arrayBuffer();
  if (body.byteLength > MAX_MCP_BODY_BYTES) {
    return c.json({
      jsonrpc: "2.0",
      error: { code: -32602, message: "Invalid parameters" },
      id: null,
    });
  }

  await next();
};

// JSON-RPC 2.0 request/response schemas
const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.record(z.any()).optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  result: z.any().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.any().optional(),
    })
    .optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

// MCP Tool definitions
const MCP_TOOLS = [
  {
    name: "search_courses",
    description:
      "Search for NTHU courses using full-text search. Returns structured course information and parsed eligibility. Optional level/year/unit arguments annotate every result with can_select and never filter results. Pass unit exactly as the student wrote it and treat unknown as requiring a check of the restriction text. IMPORTANT: Search by course name, topic, or instructor name - NOT by course ID/code (e.g., search 'machine learning' not 'CS535100'). Each result includes raw_id which can be used with get_course_details or get_course_syllabus for more information.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query for courses, max 200 characters. Use course name, topic, or instructor name (e.g., 'machine learning', 'artificial intelligence', 'John Doe'). Avoid using course codes/IDs.",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of results to return (default: 10, max: 50)",
          minimum: 1,
          maximum: 50,
        },
        level: {
          type: "string",
          description: "Optional student level for eligibility annotation",
        },
        year: {
          type: "number",
          description: "Optional student year, from 1 to 10",
        },
        unit: {
          type: "string",
          description:
            "Optional student department/programme, exactly as the student wrote it",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_course_details",
    description:
      "Get detailed information about a specific course by its raw_id (obtained from search_courses results). Returns comprehensive course information including syllabus, schedule, and requirements.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description:
            "Course raw_id (from search results, e.g., '11420CS 535100')",
        },
      },
      required: ["courseId"],
    },
  },
  {
    name: "get_course_syllabus",
    description:
      "Get detailed syllabus information for a course including objectives, description, prerequisites, grading breakdown, and important dates. Use the raw_id from search_courses results.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description:
            "Course raw_id (from search results, e.g., '11420CS 535100')",
        },
      },
      required: ["courseId"],
    },
  },
  {
    name: "get_multiple_courses",
    description:
      "Get information for multiple courses by their raw_ids (obtained from search results).",
    inputSchema: {
      type: "object",
      properties: {
        courseIds: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Array of up to 50 course raw_ids, each at most 100 characters (e.g., ['11420CS 535100', '11420EE 200201'])",
        },
      },
      required: ["courseIds"],
    },
  },
  {
    name: "bulk_search_courses",
    description:
      "Search for courses using multiple query strings and optional filters. Useful for comparing different topics or finding courses across multiple criteria. Returns every upstream result with raw_id and parsed eligibility. Optional student level/year/unit arguments annotate results with can_select and never filter them; pass unit exactly as the student wrote it and treat unknown as requiring a check of the restriction text.",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Array of up to 5 search queries, each at most 200 characters (e.g., ['machine learning', 'data science', 'artificial intelligence'])",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of results to return per query (default: 5, max: 20)",
          minimum: 1,
          maximum: 20,
        },
        filters: {
          type: "object",
          description: "Optional filters to apply to all queries",
          properties: {
            department: {
              type: "string",
              description: "Filter by department (e.g., 'CS', 'EE', 'MATH')",
            },
            language: {
              type: "string",
              description: "Filter by language (e.g., 'zh', 'en')",
            },
            semester: {
              type: "string",
              description: "Filter by semester (e.g., '11410', '11420')",
            },
            level: {
              type: "string",
              description: "Optional student level for eligibility annotation",
            },
            year: {
              type: "number",
              description: "Optional student year, from 1 to 10",
            },
            unit: {
              type: "string",
              description:
                "Optional student department/programme, exactly as the student wrote it",
            },
          },
        },
      },
      required: ["queries"],
    },
  },
];

// MCP Resource definitions
const MCP_RESOURCES = [
  {
    uri: "courseweb://courses/search",
    name: "Course Search",
    description: "Search interface for NTHU courses",
    mimeType: "application/json",
  },
  {
    uri: "courseweb://courses/all",
    name: "All Courses",
    description:
      "Bounded listing of up to 100 available courses with essential columns",
    mimeType: "application/json",
  },
];

const app = new Hono<{ Bindings: Bindings }>()
  .use(
    "*",
    rateLimitMiddleware({
      limiter: "MCP_RATE_LIMITER",
      errorMessage: "Too many MCP requests. Please try again in a minute.",
    }),
  )
  .post(
    "/",
    rejectOversizedBody,
    zValidator("json", JsonRpcRequestSchema),
    async (c) => {
      const request = c.req.valid("json");
      const { method, params, id } = request;

      try {
        switch (method) {
          case "initialize": {
            return c.json({
              jsonrpc: "2.0",
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: {
                    listChanged: false,
                  },
                  resources: {
                    subscribe: false,
                    listChanged: false,
                  },
                },
                serverInfo: {
                  name: "courseweb-mcp-server",
                  version: "1.0.0",
                },
              },
              id,
            });
          }

          case "tools/list": {
            return c.json({
              jsonrpc: "2.0",
              result: {
                tools: MCP_TOOLS,
              },
              id,
            });
          }

          case "resources/list": {
            return c.json({
              jsonrpc: "2.0",
              result: {
                resources: MCP_RESOURCES,
              },
              id,
            });
          }

          case "tools/call": {
            const { name, arguments: args } = params || {};

            switch (name) {
              case "search_courses": {
                const parsedArgs = parseToolArgs(searchCoursesArgsSchema, args);
                const { query, limit } = parsedArgs;
                const student = studentFromFilters(parsedArgs);
                const index = algolia(c);

                try {
                  const { hits } = await index.search(query, {
                    hitsPerPage: Math.min(limit, 50),
                  });

                  // Format results as structured JSON similar to CourseListItem
                  const courses = hits.map((hit: any) =>
                    toMcpCourseSummary(hit, student),
                  );

                  return c.json({
                    jsonrpc: "2.0",
                    result: {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify(
                            {
                              query,
                              total: hits.length,
                              courses,
                              note: "Use raw_id with get_course_details or get_course_syllabus for more information",
                            },
                            null,
                            2,
                          ),
                        },
                      ],
                      isError: false,
                    },
                    id,
                  });
                } catch (error) {
                  throw new Error(
                    `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                  );
                }
              }

              case "get_course_details": {
                const { courseId } = parseToolArgs(courseIdArgsSchema, args);
                const { data, error } = await supabase_server(c)
                  .from("courses")
                  .select("*")
                  .eq("raw_id", courseId)
                  .single();

                if (error || !data) {
                  throw new Error(`Course not found: ${courseId}`);
                }

                return c.json({
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            raw_id: data.raw_id,
                            course: data.course,
                            department: data.department,
                            class: data.class,
                            name_zh: data.name_zh,
                            name_en: data.name_en,
                            teacher_zh: data.teacher_zh || [],
                            teacher_en: data.teacher_en || [],
                            credits: data.credits,
                            times: data.times || [],
                            venues: data.venues || [],
                            language: data.language,
                            semester: data.semester,
                            capacity: data.capacity,
                            note: data.note,
                            restrictions: data.restrictions,
                            eligibility: eligibilitySummary(data.restrictions),
                            prerequisites: data.prerequisites,
                            cross_discipline: data.cross_discipline || [],
                            ge_type: data.ge_type,
                            compulsory_for: data.compulsory_for || [],
                            elective_for: data.elective_for || [],
                            first_specialization:
                              data.first_specialization || [],
                            second_specialization:
                              data.second_specialization || [],
                            reserve: data.reserve,
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                    isError: false,
                  },
                  id,
                });
              }

              case "get_course_syllabus": {
                const { courseId } = parseToolArgs(courseIdArgsSchema, args);
                const { data, error } = await supabase_server(c)
                  .from("courses")
                  .select(
                    `*, course_syllabus ( * ), course_scores ( * ), course_dates ( * )`,
                  )
                  .eq("raw_id", courseId)
                  .single();

                if (error || !data) {
                  throw new Error(`Course syllabus not found: ${courseId}`);
                }

                const syllabusInfo = Array.isArray(data.course_syllabus)
                  ? data.course_syllabus[0]
                  : null;
                const scores = Array.isArray(data.course_scores)
                  ? data.course_scores
                  : [];
                const dates = Array.isArray(data.course_dates)
                  ? data.course_dates
                  : [];

                return c.json({
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            raw_id: data.raw_id,
                            course: data.course,
                            name_zh: data.name_zh,
                            name_en: data.name_en,
                            teacher_zh: data.teacher_zh || [],
                            teacher_en: data.teacher_en || [],
                            syllabus: {
                              brief: syllabusInfo?.brief,
                              objectives: syllabusInfo?.objectives,
                              description: syllabusInfo?.content,
                              requirements: syllabusInfo?.requirements,
                              prerequisites: data.prerequisites,
                              note: data.note,
                              restrictions: data.restrictions,
                              eligibility: eligibilitySummary(
                                data.restrictions,
                              ),
                            },
                            grading: scores.map((s: any) => ({
                              type: s.type,
                              percentage: s.percentage,
                            })),
                            important_dates: dates.map((d: any) => ({
                              title: d.title,
                              date: d.date,
                            })),
                            scores: data.course_scores
                              ? {
                                  type: data.course_scores.type,
                                  average: data.course_scores.average,
                                  std_dev: data.course_scores.std_dev,
                                }
                              : null,
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                    isError: false,
                  },
                  id,
                });
              }

              case "get_multiple_courses": {
                const { courseIds } = parseToolArgs(
                  multipleCoursesArgsSchema,
                  args,
                );
                const { data, error } = await supabase_server(c)
                  .from("courses")
                  .select("*")
                  .in("raw_id", courseIds);

                if (error) {
                  throw new Error(`Failed to fetch courses: ${error.message}`);
                }

                return c.json({
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify(
                          {
                            total: data.length,
                            courses: data.map((course: any) => ({
                              raw_id: course.raw_id,
                              course: course.course,
                              department: course.department,
                              class: course.class,
                              name_zh: course.name_zh,
                              name_en: course.name_en,
                              teacher_zh: course.teacher_zh || [],
                              teacher_en: course.teacher_en || [],
                              credits: course.credits,
                              times: course.times || [],
                              venues: course.venues || [],
                              language: course.language,
                              semester: course.semester,
                              capacity: course.capacity,
                              note: course.note,
                              restrictions: course.restrictions,
                              eligibility: eligibilitySummary(
                                course.restrictions,
                              ),
                            })),
                          },
                          null,
                          2,
                        ),
                      },
                    ],
                    isError: false,
                  },
                  id,
                });
              }

              case "bulk_search_courses": {
                const { queries, limit, filters } = parseToolArgs(
                  bulkSearchArgsSchema,
                  args,
                );
                const index = algolia(c);

                try {
                  // Build Algolia filters if provided
                  const algoliaFilters: string[] = [];
                  if (filters.department) {
                    algoliaFilters.push(`department:"${filters.department}"`);
                  }
                  if (filters.language) {
                    algoliaFilters.push(`language:"${filters.language}"`);
                  }
                  if (filters.semester) {
                    algoliaFilters.push(`semester:"${filters.semester}"`);
                  }
                  const student = studentFromFilters(filters);

                  // Perform searches for each query
                  const searchPromises = queries.map((query: string) =>
                    index.search(query, {
                      hitsPerPage: Math.min(limit, 20),
                      filters: algoliaFilters.join(" AND ") || undefined,
                    }),
                  );

                  const results = await Promise.all(searchPromises);

                  // Format results
                  const formattedResults = results.map((result, idx) => ({
                    query: queries[idx],
                    total: result.hits.length,
                    courses: result.hits.map((hit: any) =>
                      toMcpCourseSummary(hit, student),
                    ),
                  }));

                  return c.json({
                    jsonrpc: "2.0",
                    result: {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify(
                            {
                              filters_applied: {
                                department: filters.department,
                                language: filters.language,
                                semester: filters.semester,
                              },
                              results: formattedResults,
                              note: "Use raw_id with get_course_details or get_course_syllabus for more information",
                            },
                            null,
                            2,
                          ),
                        },
                      ],
                      isError: false,
                    },
                    id,
                  });
                } catch (error) {
                  throw new Error(
                    `Bulk search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                  );
                }
              }

              default:
                throw new Error(`Unknown tool: ${name}`);
            }
          }

          case "resources/read": {
            const { uri } = params || {};

            switch (uri) {
              case "courseweb://courses/search":
                return c.json({
                  jsonrpc: "2.0",
                  result: {
                    contents: [
                      {
                        uri,
                        mimeType: "application/json",
                        text: JSON.stringify({
                          description:
                            "Use the search_courses tool to search for courses",
                          example: {
                            method: "tools/call",
                            params: {
                              name: "search_courses",
                              arguments: {
                                query: "machine learning",
                                limit: 10,
                              },
                            },
                          },
                        }),
                      },
                    ],
                  },
                  id,
                });

              case "courseweb://courses/all": {
                // This could be expensive, so limit to essential info
                const { data, error } = await supabase_server(c)
                  .from("courses")
                  .select(
                    "raw_id, course, name_zh, name_en, teacher_zh, teacher_en, credits, department",
                  )
                  .limit(100);

                if (error) {
                  throw new Error(`Failed to fetch courses: ${error.message}`);
                }

                return c.json({
                  jsonrpc: "2.0",
                  result: {
                    contents: [
                      {
                        uri,
                        mimeType: "application/json",
                        text: JSON.stringify({
                          courses: data,
                          count: data.length,
                          note: "Limited to the first 100 courses and essential columns. Use search_courses for specific queries.",
                        }),
                      },
                    ],
                  },
                  id,
                });
              }

              default:
                throw new Error(`Unknown resource: ${uri}`);
            }
          }

          default:
            throw new Error(`Unknown method: ${method}`);
        }
      } catch (error) {
        console.error("MCP request failed:", error);
        const invalidParams = error instanceof InvalidParamsError;
        return c.json({
          jsonrpc: "2.0",
          error: {
            code: invalidParams ? -32602 : -32603,
            message: invalidParams ? error.message : "MCP request failed",
          },
          id,
        });
      }
    },
  )
  .get("/", (c) => {
    return c.json({
      name: "CourseWeb MCP Server",
      description: "Model Context Protocol server for NTHU CourseWeb API",
      version: "1.0.0",
      capabilities: {
        tools: MCP_TOOLS.map((tool) => tool.name),
        resources: MCP_RESOURCES.map((resource) => resource.uri),
      },
      endpoints: {
        mcp: "/mcp (POST for JSON-RPC 2.0 requests)",
        info: "/mcp (GET for server information)",
      },
    });
  });

export default app;
