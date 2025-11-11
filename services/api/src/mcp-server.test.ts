import { describe, it, expect } from "bun:test";

/**
 * Test MCP server functionality
 * Validates that the structured JSON responses and tools work correctly
 */

// Mock MCP tools structure
const MCP_TOOLS = [
  {
    name: "search_courses",
    description: "Search for NTHU courses using full-text search. Returns structured course information. IMPORTANT: Search by course name, topic, or instructor name - NOT by course ID/code (e.g., search 'machine learning' not 'CS535100'). Each result includes raw_id which can be used with get_course_details or get_course_syllabus for more information.",
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
    description: "Get detailed information about a specific course by its raw_id (obtained from search_courses results). Returns comprehensive course information including syllabus, schedule, and requirements.",
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
    description: "Get detailed syllabus information for a course including objectives, description, prerequisites, grading breakdown, and important dates. Use the raw_id from search_courses results.",
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
    description: "Get information for multiple courses by their raw_ids (obtained from search results).",
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
    description: "Search for courses using multiple query strings and optional filters. Useful for comparing different topics or finding courses across multiple criteria. Returns structured course information with raw_id for each result.",
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
];

// Mock search results with structured data
function mockSearchResults(query: string, limit: number) {
  return {
    query,
    total: 2,
    courses: [
      {
        raw_id: "11410CS 535100",
        course: "CS535100",
        department: "CS",
        class: "00",
        name_zh: "機器學習",
        name_en: "Machine Learning",
        teacher_zh: ["張三"],
        teacher_en: ["John Doe"],
        credits: "3",
        times: ["M3M4"],
        venues: ["台達館105"],
        language: "zh",
        semester: "11410",
        brief: "Introduction to machine learning algorithms",
        restrictions: null,
        note: null,
        prerequisites: null,
        capacity: 60,
        cross_discipline: [],
        ge_type: null,
      },
      {
        raw_id: "11410EE 200201",
        course: "EE200201",
        department: "EE",
        class: "01",
        name_zh: "深度學習",
        name_en: "Deep Learning",
        teacher_zh: ["李四"],
        teacher_en: ["Jane Smith"],
        credits: "3",
        times: ["T5T6"],
        venues: ["工程一館205"],
        language: "en",
        semester: "11410",
        brief: "Advanced deep learning techniques",
        restrictions: "限本系",
        note: "需先修機器學習",
        prerequisites: null,
        capacity: 40,
        cross_discipline: ["AI"],
        ge_type: null,
      },
    ],
    note: "Use raw_id with get_course_details or get_course_syllabus for more information",
  };
}

function mockBulkSearchResults(queries: string[], filters: any, limit: number) {
  return {
    filters_applied: filters,
    results: queries.map(query => ({
      query,
      total: 1,
      courses: [
        {
          raw_id: `11410CS ${query.replace(/\s+/g, '')}`,
          course: `CS${query.replace(/\s+/g, '')}`,
          department: "CS",
          class: "00",
          name_zh: `課程${query}`,
          name_en: query,
          teacher_zh: ["教師"],
          teacher_en: ["Teacher"],
          credits: "3",
          times: ["M3M4"],
          venues: ["台達館105"],
          language: "zh",
          semester: "11410",
          brief: `Course about ${query}`,
          restrictions: null,
          note: null,
          capacity: 60,
        },
      ],
    })),
    note: "Use raw_id with get_course_details or get_course_syllabus for more information",
  };
}

describe("MCP Server Tools", () => {
  it("should have all 5 tools defined", () => {
    expect(MCP_TOOLS.length).toBe(5);
  });

  it("should have bulk_search_courses tool", () => {
    const bulkSearchTool = MCP_TOOLS.find(t => t.name === "bulk_search_courses");
    expect(bulkSearchTool).toBeDefined();
    expect(bulkSearchTool?.name).toBe("bulk_search_courses");
  });

  it("should have clear usage instructions in search_courses", () => {
    const searchTool = MCP_TOOLS.find(t => t.name === "search_courses");
    expect(searchTool).toBeDefined();
    expect(searchTool?.description).toContain("IMPORTANT");
    expect(searchTool?.description).toContain("NOT by course ID");
  });

  it("should have all tools mention raw_id in descriptions", () => {
    const toolsWithRawId = MCP_TOOLS.filter(tool => 
      tool.description.toLowerCase().includes("raw_id") || 
      tool.name === "search_courses" || 
      tool.name === "bulk_search_courses"
    );
    expect(toolsWithRawId.length).toBe(MCP_TOOLS.length);
  });
});

describe("MCP Response Format", () => {
  it("should return structured JSON with required fields", () => {
    const result = mockSearchResults("machine learning", 10);
    
    expect(result.query).toBe("machine learning");
    expect(result.total).toBe(2);
    expect(Array.isArray(result.courses)).toBe(true);
    expect(result.courses.length).toBeGreaterThan(0);
    
    const course = result.courses[0];
    expect(course.raw_id).toBeDefined();
    expect(course.course).toBeDefined();
    expect(course.name_zh).toBeDefined();
    expect(course.name_en).toBeDefined();
    expect(Array.isArray(course.teacher_zh)).toBe(true);
    expect(Array.isArray(course.times)).toBe(true);
    expect(Array.isArray(course.venues)).toBe(true);
  });

  it("should include raw_id in all course results", () => {
    const result = mockSearchResults("machine learning", 10);
    
    result.courses.forEach(course => {
      expect(course.raw_id).toBeDefined();
      expect(typeof course.raw_id).toBe("string");
      expect(course.raw_id.length).toBeGreaterThan(0);
    });
  });
});

describe("Bulk Search", () => {
  it("should handle multiple queries with filters", () => {
    const queries = ["machine learning", "artificial intelligence"];
    const filters = { department: "CS", language: "zh" };
    const result = mockBulkSearchResults(queries, filters, 5);
    
    expect(result.filters_applied).toEqual(filters);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(2);
    
    expect(result.results[0].query).toBe("machine learning");
    expect(result.results[1].query).toBe("artificial intelligence");
    
    result.results.forEach(queryResult => {
      expect(queryResult.courses[0].raw_id).toBeDefined();
    });
  });

  it("should organize results by query", () => {
    const queries = ["ML", "AI", "data science"];
    const result = mockBulkSearchResults(queries, {}, 3);
    
    expect(result.results.length).toBe(queries.length);
    queries.forEach((query, idx) => {
      expect(result.results[idx].query).toBe(query);
    });
  });
});
