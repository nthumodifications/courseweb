import type { FunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";
import type { Context } from "hono";
import algolia from "../config/algolia";
import supabase_server from "../config/supabase_server";
import {
  getCachedRequirements,
  setCachedRequirements,
} from "../graduation/cache";
import { scrapeAllColleges, findRequirementsPDF } from "../graduation/scraper";

// Tool definitions using Gemini's native JSON Schema format
// This avoids all the Zod compatibility issues with AI SDK

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_courses",
    description:
      "Search for NTHU courses by topic, name, or instructor. By default searches current/recent semester only. Returns course list with raw_ids.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Search query - course name, topic, or instructor",
        },
        semester: {
          type: Type.STRING,
          description:
            'Optional semester filter (e.g., "11420"). If not specified, defaults to current or most recent semester from user context.',
        },
        limit: {
          type: Type.NUMBER,
          description: "Max results (1-20, default 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_course_details",
    description: "Get detailed info about a specific course by raw_id",
    parameters: {
      type: Type.OBJECT,
      properties: {
        courseId: {
          type: Type.STRING,
          description:
            'Course raw_id from search results (e.g., "11420CS 535100")',
        },
      },
      required: ["courseId"],
    },
  },
  {
    name: "compare_courses",
    description: "Search and compare multiple course topics at once",
    parameters: {
      type: Type.OBJECT,
      properties: {
        queries: {
          type: Type.STRING,
          description:
            'Comma-separated search queries (e.g., "machine learning,deep learning")',
        },
        department: {
          type: Type.STRING,
          description: 'Filter by department code (e.g., "CS", "EE")',
        },
      },
      required: ["queries"],
    },
  },
  {
    name: "list_departments",
    description:
      "List all available departments with graduation requirements. Use this to map English department names to Chinese.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_graduation_requirements",
    description:
      "Find graduation requirements PDF for a department and entrance year. Department must be in Chinese. Use list_departments first to get exact Chinese names.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        department: {
          type: Type.STRING,
          description:
            'Department name in Chinese (e.g., "資訊工程學系", "電機工程學系")',
        },
        entranceYear: {
          type: Type.STRING,
          description: 'Entrance year (e.g., "113", "112")',
        },
      },
      required: ["department", "entranceYear"],
    },
  },
];

// Helper function to search courses
async function searchCourses(
  c: Context,
  query: string,
  limit: number = 10,
  semester?: string,
): Promise<unknown> {
  const index = algolia(c);

  try {
    const searchParams: any = {
      hitsPerPage: Math.min(limit, 50),
    };

    // Add semester filter if provided
    if (semester) {
      searchParams.filters = `semester:${semester}`;
    }

    const { hits } = await index.search(query, searchParams);

    // Format results as structured JSON
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

    return {
      query,
      total: hits.length,
      courses,
      note: "Use raw_id with get_course_details for more information",
    };
  } catch (error) {
    throw new Error(
      `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Helper function to get course details
async function getCourseDetails(
  c: Context,
  courseId: string,
): Promise<unknown> {
  const { data, error } = await supabase_server(c)
    .from("courses")
    .select("*")
    .eq("raw_id", courseId)
    .single();

  if (error || !data) {
    throw new Error(`Course not found: ${courseId}`);
  }

  return {
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
  };
}

// Helper function to bulk search courses
async function bulkSearchCourses(
  c: Context,
  queries: string[],
  limit: number = 5,
  filters?: Record<string, string>,
): Promise<unknown> {
  const index = algolia(c);

  try {
    // Build Algolia filters if provided
    const algoliaFilters: string[] = [];
    if (filters?.department) {
      algoliaFilters.push(`department:"${filters.department}"`);
    }
    if (filters?.language) {
      algoliaFilters.push(`language:"${filters.language}"`);
    }
    if (filters?.semester) {
      algoliaFilters.push(`semester:"${filters.semester}"`);
    }

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

    return {
      filters_applied: filters || {},
      results: formattedResults,
      note: "Use raw_id with get_course_details for more information",
    };
  } catch (error) {
    throw new Error(
      `Bulk search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Tool executor - maps tool names to actual functions
export async function executeTool(
  c: Context,
  toolName: string,
  args: Record<string, unknown>,
  userContext?: any,
): Promise<unknown> {
  switch (toolName) {
    case "search_courses": {
      // Use provided semester or default to current semester from user context
      const semester =
        (args.semester as string) || userContext?.currentSemester;
      return searchCourses(
        c,
        args.query as string,
        (args.limit as number) || 10,
        semester,
      );
    }

    case "get_course_details":
      return getCourseDetails(c, args.courseId as string);

    case "compare_courses": {
      const queries = (args.queries as string).split(",").map((q) => q.trim());
      const filters: Record<string, string> = {};
      if (args.department) filters.department = args.department as string;
      return bulkSearchCourses(
        c,
        queries,
        5,
        Object.keys(filters).length ? filters : undefined,
      );
    }

    case "list_departments": {
      // Try to get from cache first
      let colleges = await getCachedRequirements(c);
      if (!colleges) {
        // If not cached, scrape and cache
        colleges = await scrapeAllColleges();
        await setCachedRequirements(c, colleges);
      }

      // Flatten all departments from all colleges
      const allDepartments = colleges.flatMap((college) =>
        college.departments.map((dept) => ({
          college: college.name,
          department: dept.name,
          availableYears: dept.years.map((y) => y.year),
        })),
      );

      return {
        total: allDepartments.length,
        departments: allDepartments,
        note: "Use the exact Chinese department name with get_graduation_requirements. Common mappings: CS=資訊工程學系, EE=電機工程學系",
      };
    }

    case "get_graduation_requirements": {
      const department = args.department as string;
      const entranceYear = args.entranceYear as string;

      // Try to get from cache first
      let colleges = await getCachedRequirements(c);
      if (!colleges) {
        // If not cached, scrape and cache
        colleges = await scrapeAllColleges();
        await setCachedRequirements(c, colleges);
      }

      const result = await findRequirementsPDF(
        colleges,
        department,
        entranceYear,
      );

      if (!result) {
        return {
          found: false,
          message: `找不到 ${department} ${entranceYear} 入學年度的畢業學分表`,
          searched: { department, entranceYear },
        };
      }

      // Return PDF URL for Gemini File API to fetch
      return {
        found: true,
        college: result.college,
        department: result.department,
        entranceYear,
        pdfUrl: result.pdfUrl,
        uploadToGemini: true, // Signal that this should be uploaded to Gemini
        message: `找到 ${result.college} ${result.department} ${entranceYear} 入學年度的畢業學分表PDF`,
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
