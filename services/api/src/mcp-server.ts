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
      "Search for NTHU courses using full-text search. Returns structured course information. IMPORTANT: Search by course name, topic, or instructor name - NOT by course ID/code (e.g., search 'machine learning' not 'CS535100'). Each result includes raw_id which can be used with get_course_details or get_course_syllabus for more information.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for courses. Use course name, topic, or instructor name (e.g., 'machine learning', 'artificial intelligence', 'John Doe'). Avoid using course codes/IDs.",
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
      "Get detailed information about a specific course by its raw_id (obtained from search_courses results). Returns comprehensive course information including syllabus, schedule, and requirements.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "Course raw_id (from search results, e.g., '11410CS 535100')",
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
          description: "Course raw_id (from search results, e.g., '11410CS 535100')",
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
          description: "Array of course raw_ids to retrieve (e.g., ['11410CS 535100', '11410EE 200201'])",
        },
      },
      required: ["courseIds"],
    },
  },
  {
    name: "bulk_search_courses",
    description:
      "Search for courses using multiple query strings and optional filters. Useful for comparing different topics or finding courses across multiple criteria. Returns structured course information with raw_id for each result.",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Array of search queries (e.g., ['machine learning', 'data science', 'artificial intelligence'])",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return per query (default: 5, max: 20)",
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
          },
        },
      },
      required: ["queries"],
    },
  },
  {
    name: "get_graduation_requirements",
    description:
      "Fetch graduation requirements for NTHU departments. Navigates the university's graduation requirements page to find PDF documents for specific colleges, departments/programs, and entrance years. Returns PDF URLs and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        college: {
          type: "string",
          description: "College name in Chinese (e.g., '電機資訊學院', '理學院', '工學院')",
        },
        department: {
          type: "string",
          description: "Department or program name in Chinese (e.g., '電機資訊學院學士班', '資訊工程學系', '電機工程學系'). Optional - if not provided, returns all departments in the college.",
        },
        year: {
          type: "string",
          description: "Entrance year (e.g., '111', '112', '113', '114'). Optional - if not provided, returns all available years.",
        },
      },
      required: ["college"],
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
                  
                  // Format results as structured JSON similar to CourseListItem
                  const courses = hits.map((hit: any) => ({
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
                  }));
                  
                  return c.json({
                    jsonrpc: "2.0",
                    result: {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify({
                            query,
                            total: hits.length,
                            courses,
                            note: "Use raw_id with get_course_details or get_course_syllabus for more information",
                          }, null, 2),
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
                        text: JSON.stringify({
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
                          prerequisites: data.prerequisites,
                          cross_discipline: data.cross_discipline || [],
                          ge_type: data.ge_type,
                          compulsory_for: data.compulsory_for || [],
                          elective_for: data.elective_for || [],
                          first_specialization: data.first_specialization || [],
                          second_specialization: data.second_specialization || [],
                          reserve: data.reserve,
                        }, null, 2),
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
                        text: JSON.stringify({
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
                          },
                          grading: scores.map((s: any) => ({
                            type: s.type,
                            percentage: s.percentage,
                          })),
                          important_dates: dates.map((d: any) => ({
                            title: d.title,
                            date: d.date,
                          })),
                          scores: data.course_scores ? {
                            type: data.course_scores.type,
                            average: data.course_scores.average,
                            std_dev: data.course_scores.std_dev,
                          } : null,
                        }, null, 2),
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
                        text: JSON.stringify({
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
                          })),
                        }, null, 2),
                      },
                    ],
                    isError: false,
                  },
                  id,
                });
              }

              case "bulk_search_courses": {
                const { queries, limit = 5, filters = {} } = args;
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
                  
                  // Perform searches for each query
                  const searchPromises = queries.map((query: string) =>
                    index.search(query, {
                      hitsPerPage: Math.min(limit, 20),
                      filters: algoliaFilters.join(" AND ") || undefined,
                    })
                  );
                  
                  const results = await Promise.all(searchPromises);
                  
                  // Format results
                  const formattedResults = results.map((result, idx) => ({
                    query: queries[idx],
                    total: result.hits.length,
                    courses: result.hits.map((hit: any) => ({
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
                      capacity: hit.capacity,
                    })),
                  }));
                  
                  return c.json({
                    jsonrpc: "2.0",
                    result: {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify({
                            filters_applied: filters,
                            results: formattedResults,
                            note: "Use raw_id with get_course_details or get_course_syllabus for more information",
                          }, null, 2),
                        },
                      ],
                      isError: false,
                    },
                    id,
                  });
                } catch (error) {
                  throw new Error(`Bulk search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }

              case "get_graduation_requirements": {
                const { college, department, year } = args;
                
                try {
                  // Step 1: Fetch the main graduation requirements page
                  const mainPageUrl = "https://registra.site.nthu.edu.tw/p/412-1211-1826.php?Lang=zh-tw";
                  const mainPageResponse = await fetch(mainPageUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                  });
                  
                  if (!mainPageResponse.ok) {
                    throw new Error(`Failed to fetch main page: ${mainPageResponse.statusText}`);
                  }
                  
                  const mainPageHtml = await mainPageResponse.text();
                  
                  // Step 2: Find the college link
                  const collegeLinkMatch = mainPageHtml.match(
                    new RegExp(`<a[^>]*href="([^"]*)"[^>]*title="${college}"`, 'i')
                  ) || mainPageHtml.match(
                    new RegExp(`<a[^>]*title="${college}"[^>]*href="([^"]*)"`, 'i')
                  );
                  
                  if (!collegeLinkMatch) {
                    throw new Error(`College not found: ${college}. Please check the college name.`);
                  }
                  
                  let collegePageUrl = collegeLinkMatch[1];
                  if (collegePageUrl.startsWith('/')) {
                    collegePageUrl = `https://registra.site.nthu.edu.tw${collegePageUrl}`;
                  }
                  
                  // Step 3: Fetch the college page
                  const collegePageResponse = await fetch(collegePageUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                      'Referer': mainPageUrl,
                    },
                  });
                  
                  if (!collegePageResponse.ok) {
                    throw new Error(`Failed to fetch college page: ${collegePageResponse.statusText}`);
                  }
                  
                  const collegePageHtml = await collegePageResponse.text();
                  
                  // Step 4: Parse departments and PDF links
                  const departments: any[] = [];
                  
                  // Extract department sections - look for patterns like:
                  // <p>電機資訊學院學士班</p> followed by year links
                  const departmentPattern = /<p>([^<]+?學[系所士班組](?:國際學生組)?[^<]*?)<\/p>/gi;
                  const matches = collegePageHtml.matchAll(departmentPattern);
                  
                  for (const match of matches) {
                    const deptName = match[1].trim();
                    
                    // Skip if department filter is specified and doesn't match
                    if (department && !deptName.includes(department)) {
                      continue;
                    }
                    
                    // Find PDF links following this department name
                    const afterDeptHtml = collegePageHtml.substring(match.index!);
                    const nextDeptMatch = afterDeptHtml.substring(1).search(/<p>[^<]+?學[系所士班組]/);
                    const sectionHtml = nextDeptMatch > 0 
                      ? afterDeptHtml.substring(0, nextDeptMatch + 1)
                      : afterDeptHtml.substring(0, 500); // Take next 500 chars if no next dept
                    
                    // Extract year links
                    const yearLinkPattern = /<a[^>]*href="([^"]*)"[^>]*>(\d{3})<\/a>/g;
                    const yearMatches = sectionHtml.matchAll(yearLinkPattern);
                    
                    const years: any[] = [];
                    for (const yearMatch of yearMatches) {
                      let pdfUrl = yearMatch[1];
                      const yearNum = yearMatch[2];
                      
                      // Skip if year filter is specified and doesn't match
                      if (year && yearNum !== year) {
                        continue;
                      }
                      
                      if (pdfUrl.startsWith('/')) {
                        pdfUrl = `https://registra.site.nthu.edu.tw${pdfUrl}`;
                      }
                      
                      years.push({
                        year: yearNum,
                        pdf_url: pdfUrl,
                      });
                    }
                    
                    if (years.length > 0) {
                      departments.push({
                        department: deptName,
                        years,
                      });
                    }
                  }
                  
                  if (departments.length === 0) {
                    throw new Error(`No matching departments found. College: ${college}, Department: ${department || 'all'}, Year: ${year || 'all'}`);
                  }
                  
                  return c.json({
                    jsonrpc: "2.0",
                    result: {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify({
                            college,
                            total_departments: departments.length,
                            departments,
                            note: "PDF URLs may require proper referer headers when accessed. Direct download may return 403.",
                          }, null, 2),
                        },
                      ],
                      isError: false,
                    },
                    id,
                  });
                } catch (error) {
                  throw new Error(`Failed to fetch graduation requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
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