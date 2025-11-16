import { Hono } from "hono";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, convertToModelMessages, CoreMessage } from 'ai';
import { z } from "zod";

const app = new Hono();

// Get API key from environment
const defaultApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Helper function to call MCP tools
async function callMCPTool(toolName: string, args: any, c: any) {
  // Import the MCP server logic directly
  const mcpTools: Record<string, any> = {
    search_courses: async (args: { query: string; limit?: number }) => {
      const { default: algolia } = await import("./config/algolia");
      const index = algolia(c);
      const { hits } = await index.search(args.query, {
        hitsPerPage: Math.min(args.limit || 10, 50),
      });
      
      return {
        query: args.query,
        total: hits.length,
        courses: hits.map((hit: any) => ({
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
        })),
      };
    },
    
    get_course_details: async (args: { courseId: string }) => {
      const { default: supabase_server } = await import("./config/supabase_server");
      const { data, error } = await supabase_server(c)
        .from("courses")
        .select("*")
        .eq("raw_id", args.courseId)
        .single();
        
      if (error || !data) {
        throw new Error(`Course not found: ${args.courseId}`);
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
    },
    
    get_course_syllabus: async (args: { courseId: string }) => {
      const { default: supabase_server } = await import("./config/supabase_server");
      const { data, error } = await supabase_server(c)
        .from("courses")
        .select(
          `*, course_syllabus ( * ), course_scores ( * ), course_dates ( * )`
        )
        .eq("raw_id", args.courseId)
        .single();
        
      if (error || !data) {
        throw new Error(`Course syllabus not found: ${args.courseId}`);
      }
      
      const syllabusInfo = Array.isArray(data.course_syllabus) ? data.course_syllabus[0] : null;
      const scores = Array.isArray(data.course_scores) ? data.course_scores : [];
      const dates = Array.isArray(data.course_dates) ? data.course_dates : [];
      
      return {
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
      };
    },
    
    get_multiple_courses: async (args: { courseIds: string[] }) => {
      const { default: supabase_server } = await import("./config/supabase_server");
      const { data, error } = await supabase_server(c)
        .from("courses")
        .select("*")
        .in("raw_id", args.courseIds);
        
      if (error) {
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }
      
      return {
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
      };
    },
    
    bulk_search_courses: async (args: { queries: string[]; limit?: number; filters?: any }) => {
      const { default: algolia } = await import("./config/algolia");
      const index = algolia(c);
      const { queries, limit = 5, filters = {} } = args;
      
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
      return {
        filters_applied: filters,
        results: results.map((result, idx) => ({
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
        })),
      };
    },
  };
  
  if (!mcpTools[toolName]) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  return await mcpTools[toolName](args);
}

app.post("/", async (c) => {
  try {
    const { messages, userApiKey } = await c.req.json<{
      messages: CoreMessage[];
      userApiKey?: string;
    }>();

    // Use user-provided API key if available, otherwise use server default
    const effectiveApiKey = userApiKey || defaultApiKey;

    if (!effectiveApiKey) {
      return c.json(
        { error: 'No API key provided. Please configure your API key in settings.' },
        400
      );
    }

    // Create provider with the effective API key
    const google = createGoogleGenerativeAI({
      apiKey: effectiveApiKey,
    });

    const result = streamText({
      model: google('gemini-2.0-flash-exp'),
      system: `You are a helpful course planning assistant for National Tsing Hua University (NTHU).

Your role is to help students plan their courses for upcoming semesters. You have access to:
1. NTHU course database through search tools
2. Course details and syllabi
3. Graduation requirements information

Guidelines:
- Always search courses by name, topic, or instructor name (NOT by course code)
- When recommending courses, consider prerequisites, time conflicts, and workload
- Provide clear explanations for your recommendations
- If you need more information about a student's background, ask them
- Be conversational and friendly

Important: When searching for courses, use descriptive terms like "machine learning" or "calculus" instead of course codes like "CS535100".`,
      messages: messages,
      maxSteps: 5,
      tools: {
        searchCourses: tool({
          description: 'Search for NTHU courses by name, topic, or instructor. Use descriptive search terms, not course codes. Returns course information including raw_id for further details.',
          parameters: z.object({
            query: z.string().describe('Search query using course name, topic, or instructor name (e.g., "machine learning", "calculus", "artificial intelligence")'),
            limit: z.number().optional().describe('Maximum number of results (default: 10, max: 50)'),
          }),
          execute: async ({ query, limit = 10 }) => {
            return await callMCPTool('search_courses', { query, limit }, c);
          },
        }),
        
        getCourseDetails: tool({
          description: 'Get detailed information about a specific course using its raw_id from search results',
          parameters: z.object({
            courseId: z.string().describe('Course raw_id from search results (e.g., "11410CS 535100")'),
          }),
          execute: async ({ courseId }) => {
            return await callMCPTool('get_course_details', { courseId }, c);
          },
        }),
        
        getCourseSyllabus: tool({
          description: 'Get detailed syllabus including objectives, grading, and prerequisites for a course',
          parameters: z.object({
            courseId: z.string().describe('Course raw_id from search results'),
          }),
          execute: async ({ courseId }) => {
            return await callMCPTool('get_course_syllabus', { courseId }, c);
          },
        }),
        
        getMultipleCourses: tool({
          description: 'Get information for multiple courses at once using their raw_ids',
          parameters: z.object({
            courseIds: z.array(z.string()).describe('Array of course raw_ids'),
          }),
          execute: async ({ courseIds }) => {
            return await callMCPTool('get_multiple_courses', { courseIds }, c);
          },
        }),
        
        bulkSearchCourses: tool({
          description: 'Search multiple topics at once and compare courses across different areas',
          parameters: z.object({
            queries: z.array(z.string()).describe('Array of search queries'),
            limit: z.number().optional().describe('Results per query (default: 5, max: 20)'),
            filters: z.object({
              department: z.string().optional().describe('Filter by department code'),
              language: z.string().optional().describe('Filter by language (zh/en)'),
              semester: z.string().optional().describe('Filter by semester'),
            }).optional(),
          }),
          execute: async ({ queries, limit = 5, filters }) => {
            return await callMCPTool('bulk_search_courses', { queries, limit, filters }, c);
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500
    );
  }
});

export default app;
