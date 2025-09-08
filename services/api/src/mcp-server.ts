import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import algolia from "./config/algolia";
import supabase_server from "./config/supabase_server";

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
      "Search for NTHU courses using full-text search. Returns course information including course code, name, instructor, and basic details.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for courses (course name, instructor, code, etc.)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10, max: 50)",
          minimum: 1,
          maximum: 50,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_course_details",
    description:
      "Get detailed information about a specific course by its ID/code.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "Course ID or raw_id to get details for",
        },
      },
      required: ["courseId"],
    },
  },
  {
    name: "get_course_syllabus",
    description:
      "Get detailed syllabus information for a course including scores and important dates.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "Course ID to get syllabus for",
        },
      },
      required: ["courseId"],
    },
  },
  {
    name: "get_multiple_courses",
    description:
      "Get information for multiple courses by their IDs.",
    inputSchema: {
      type: "object",
      properties: {
        courseIds: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of course IDs to retrieve",
        },
      },
      required: ["courseIds"],
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
    description: "Complete list of available courses",
    mimeType: "application/json",
  },
];

const app = new Hono()
  .post(
    "/",
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
                const { query, limit = 10 } = args;
                const index = algolia(c);
                
                try {
                  const { hits } = await index.search(query, {
                    hitsPerPage: Math.min(limit, 50),
                  });
                  
                  return c.json({
                    jsonrpc: "2.0",
                    result: {
                      content: [
                        {
                          type: "text",
                          text: `Found ${hits.length} courses for query: "${query}"\n\n${hits
                            .map(
                              (hit: any) =>
                                `Course: ${hit.course} - ${hit.name_zh || hit.name_en}\nInstructor: ${
                                  hit.teacher_zh?.join(", ") || hit.teacher_en?.join(", ") || "N/A"
                                }\nCredits: ${hit.credits || "N/A"}\nDepartment: ${hit.department || "N/A"}`
                            )
                            .join("\n\n")}`,
                        },
                      ],
                      isError: false,
                    },
                    id,
                  });
                } catch (error) {
                  throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }

              case "get_course_details": {
                const { courseId } = args;
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
                        text: `Course Details for ${courseId}:
Course Name: ${data.name_zh || data.name_en}
Course Code: ${data.course}
Instructor: ${data.teacher_zh?.join(", ") || data.teacher_en?.join(", ") || "N/A"}
Credits: ${data.credits}
Department: ${data.department}
Class Time: ${data.times?.join(", ") || "N/A"}
Venue: ${data.venues?.join(", ") || "N/A"}
Language: ${data.language}
Enrollment Limit: ${data.capacity}
Note: ${data.note || "N/A"}`,
                      },
                    ],
                    isError: false,
                  },
                  id,
                });
              }

              case "get_course_syllabus": {
                const { courseId } = args;
                const { data, error } = await supabase_server(c)
                  .from("courses")
                  .select(
                    `*, course_syllabus ( * ), course_scores ( * ), course_dates ( * )`
                  )
                  .eq("raw_id", courseId)
                  .single();
                  
                if (error || !data) {
                  throw new Error(`Course syllabus not found: ${courseId}`);
                }
                
                const syllabusInfo = Array.isArray(data.course_syllabus) ? data.course_syllabus[0] : null;
                const scores = Array.isArray(data.course_scores) ? data.course_scores : [];
                const dates = Array.isArray(data.course_dates) ? data.course_dates : [];
                
                return c.json({
                  jsonrpc: "2.0",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: `Syllabus for ${data.name_zh || data.name_en} (${courseId}):

Course Objectives: ${syllabusInfo?.objectives || "N/A"}
Course Description: ${syllabusInfo?.description || "N/A"}
Prerequisites: ${syllabusInfo?.requirements || "N/A"}

${scores.length > 0 ? `Grading:
${scores.map((s: any) => `${s.type}: ${s.percentage}%`).join("\n")}` : ""}

${dates.length > 0 ? `Important Dates:
${dates.map((d: any) => `${d.title}: ${d.date}`).join("\n")}` : ""}`,
                      },
                    ],
                    isError: false,
                  },
                  id,
                });
              }

              case "get_multiple_courses": {
                const { courseIds } = args;
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
                        text: `Retrieved ${data.length} courses:

${data
  .map(
    (course: any) =>
      `${course.raw_id}: ${course.name_zh || course.name_en}
Instructor: ${course.teacher_zh?.join(", ") || course.teacher_en?.join(", ") || "N/A"}
Credits: ${course.credits}
Time: ${course.times?.join(", ") || "N/A"}
Venue: ${course.venues?.join(", ") || "N/A"}`
  )
  .join("\n\n")}`,
                      },
                    ],
                    isError: false,
                  },
                  id,
                });
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
                          description: "Use the search_courses tool to search for courses",
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

              case "courseweb://courses/all":
                // This could be expensive, so limit to essential info
                const { data, error } = await supabase_server(c)
                  .from("courses")
                  .select("raw_id, course, name_zh, name_en, teacher_zh, teacher_en, credits, department")
                  .limit(1000);
                  
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
                          note: "Limited to first 1000 courses. Use search_courses for specific queries.",
                        }),
                      },
                    ],
                  },
                  id,
                });

              default:
                throw new Error(`Unknown resource: ${uri}`);
            }
          }

          default:
            throw new Error(`Unknown method: ${method}`);
        }
      } catch (error) {
        return c.json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error",
            data: error instanceof Error ? error.stack : undefined,
          },
          id,
        });
      }
    }
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