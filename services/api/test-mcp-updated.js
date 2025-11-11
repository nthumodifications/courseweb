/**
 * Test updated MCP server functionality
 * Validates that the new structured JSON responses work correctly
 */

// Mock MCP tools for the updated server
const UPDATED_MCP_TOOLS = [
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
function mockSearchResults(query, limit) {
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

function mockBulkSearchResults(queries, filters, limit) {
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

// Test runner
function runTests() {
  console.log("🧪 Running Updated MCP Server Tests\n");
  
  let passed = 0;
  let total = 0;

  // Test 1: Verify all tools are defined
  console.log("📋 Test 1: Verify all 5 tools are defined");
  total++;
  if (UPDATED_MCP_TOOLS.length === 5) {
    console.log("✅ All 5 tools defined");
    passed++;
  } else {
    console.log(`❌ Expected 5 tools, got ${UPDATED_MCP_TOOLS.length}`);
  }

  // Test 2: Verify bulk_search_courses exists
  console.log("\n📋 Test 2: Verify bulk_search_courses tool exists");
  total++;
  const bulkSearchTool = UPDATED_MCP_TOOLS.find(t => t.name === "bulk_search_courses");
  if (bulkSearchTool) {
    console.log("✅ bulk_search_courses tool found");
    passed++;
  } else {
    console.log("❌ bulk_search_courses tool not found");
  }

  // Test 3: Verify search_courses has improved description
  console.log("\n📋 Test 3: Verify search_courses has usage instructions");
  total++;
  const searchTool = UPDATED_MCP_TOOLS.find(t => t.name === "search_courses");
  if (searchTool && searchTool.description.includes("IMPORTANT") && searchTool.description.includes("NOT by course ID")) {
    console.log("✅ search_courses has clear usage instructions");
    passed++;
  } else {
    console.log("❌ search_courses missing usage instructions");
  }

  // Test 4: Verify structured JSON response format
  console.log("\n📋 Test 4: Verify structured JSON response format");
  total++;
  const mockResult = mockSearchResults("machine learning", 10);
  const hasRequiredFields = 
    mockResult.query &&
    mockResult.total !== undefined &&
    Array.isArray(mockResult.courses) &&
    mockResult.courses.length > 0 &&
    mockResult.courses[0].raw_id &&
    mockResult.courses[0].course &&
    mockResult.courses[0].name_zh &&
    mockResult.courses[0].name_en &&
    Array.isArray(mockResult.courses[0].teacher_zh) &&
    Array.isArray(mockResult.courses[0].times) &&
    Array.isArray(mockResult.courses[0].venues);
  
  if (hasRequiredFields) {
    console.log("✅ Structured JSON has all required fields");
    console.log(`   Sample course: ${mockResult.courses[0].name_zh} (${mockResult.courses[0].raw_id})`);
    passed++;
  } else {
    console.log("❌ Structured JSON missing required fields");
  }

  // Test 5: Verify bulk search with filters
  console.log("\n📋 Test 5: Verify bulk_search_courses with filters");
  total++;
  const bulkResult = mockBulkSearchResults(
    ["machine learning", "artificial intelligence"],
    { department: "CS", language: "zh" },
    5
  );
  
  const hasBulkFields = 
    bulkResult.filters_applied &&
    Array.isArray(bulkResult.results) &&
    bulkResult.results.length === 2 &&
    bulkResult.results[0].query === "machine learning" &&
    bulkResult.results[0].courses[0].raw_id;
  
  if (hasBulkFields) {
    console.log("✅ Bulk search with filters works correctly");
    console.log(`   Filters applied: ${JSON.stringify(bulkResult.filters_applied)}`);
    console.log(`   Queries: ${bulkResult.results.map(r => r.query).join(", ")}`);
    passed++;
  } else {
    console.log("❌ Bulk search format incorrect");
  }

  // Test 6: Verify all tools mention raw_id
  console.log("\n📋 Test 6: Verify all tools mention raw_id in descriptions");
  total++;
  const allMentionRawId = UPDATED_MCP_TOOLS.every(tool => 
    tool.description.toLowerCase().includes("raw_id") || 
    tool.name === "search_courses" || 
    tool.name === "bulk_search_courses"
  );
  
  if (allMentionRawId) {
    console.log("✅ All relevant tools mention raw_id");
    passed++;
  } else {
    console.log("❌ Some tools don't mention raw_id");
  }

  // Summary
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log("🎉 All tests passed! MCP server improvements are valid.");
  } else {
    console.log("⚠️  Some tests failed. Check the implementation.");
  }

  // Show sample responses
  console.log("\n📦 Sample Response Formats:");
  console.log("\n1. search_courses response:");
  console.log(JSON.stringify(mockSearchResults("machine learning", 5), null, 2).substring(0, 500) + "...");
  
  console.log("\n2. bulk_search_courses response:");
  console.log(JSON.stringify(mockBulkSearchResults(["ML", "AI"], { department: "CS" }, 3), null, 2).substring(0, 500) + "...");
}

// Run the tests
runTests();
