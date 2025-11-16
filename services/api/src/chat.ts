import { Hono } from "hono";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, type CoreMessage, stepCountIs } from 'ai';
import { z } from "zod";

const app = new Hono();

// Get API key from environment
const defaultApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Helper function to call MCP server endpoint
async function callMCPTool(toolName: string, args: any) {
  // Call the MCP server endpoint directly to avoid code duplication
  const mcpRequest = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
    id: Date.now(),
  };

  // Since we're in the same service, we can import and call the MCP handler directly
  const { default: mcpServer } = await import("./mcp-server");
  
  // Create a mock request object for the MCP server
  const mockReq = {
    json: async () => mcpRequest,
  } as any;
  
  // Create a minimal context for the MCP server
  const response = await mcpServer.request('/mcp', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(mcpRequest),
  } as any);
  
  const result = await response.json() as any;
  
  if (result.error) {
    throw new Error(result.error.message || 'MCP tool execution failed');
  }
  
  // Parse the content from MCP response
  const content = result.result?.content?.[0]?.text;
  return content ? JSON.parse(content) : result.result;
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
3. Graduation requirements information (PDFs for each department and year)

Guidelines:
- Always search courses by name, topic, or instructor name (NOT by course code)
- When recommending courses, consider prerequisites, time conflicts, and workload
- You can fetch graduation requirements by specifying college, department, and entrance year
- Provide clear explanations for your recommendations
- If you need more information about a student's background (department, year of entrance), ask them
- Be conversational and friendly

Important: When searching for courses, use descriptive terms like "machine learning" or "calculus" instead of course codes like "CS535100".

For graduation requirements:
- Common colleges: 電機資訊學院, 理學院, 工學院, 人文社會學院, 生命科學院, 科技管理學院, 清華學院, 竹師教育學院, 藝術學院
- Use the getGraduationRequirements tool to find department-specific requirements
- Entrance years are typically 3-digit numbers like "111", "112", "113"`,
      messages: messages,
      stopWhen: stepCountIs(5),
      tools: {
        searchCourses: tool({
          description: 'Search for NTHU courses by name, topic, or instructor. Use descriptive search terms, not course codes. Returns course information including raw_id for further details.',
          inputSchema: z.object({
            query: z.string().describe('Search query using course name, topic, or instructor name (e.g., "machine learning", "calculus", "artificial intelligence")'),
            limit: z.number().optional().describe('Maximum number of results (default: 10, max: 50)'),
          }),
          execute: async ({ query, limit = 10 }) => {
            return await callMCPTool('search_courses', { query, limit });
          },
        }),
        
        getCourseDetails: tool({
          description: 'Get detailed information about a specific course using its raw_id from search results',
          inputSchema: z.object({
            courseId: z.string().describe('Course raw_id from search results (e.g., "11410CS 535100")'),
          }),
          execute: async ({ courseId }) => {
            return await callMCPTool('get_course_details', { courseId });
          },
        }),
        
        getCourseSyllabus: tool({
          description: 'Get detailed syllabus including objectives, grading, and prerequisites for a course',
          inputSchema: z.object({
            courseId: z.string().describe('Course raw_id from search results'),
          }),
          execute: async ({ courseId }) => {
            return await callMCPTool('get_course_syllabus', { courseId });
          },
        }),
        
        getMultipleCourses: tool({
          description: 'Get information for multiple courses at once using their raw_ids',
          inputSchema: z.object({
            courseIds: z.array(z.string()).describe('Array of course raw_ids'),
          }),
          execute: async ({ courseIds }) => {
            return await callMCPTool('get_multiple_courses', { courseIds });
          },
        }),
        
        bulkSearchCourses: tool({
          description: 'Search multiple topics at once and compare courses across different areas',
          inputSchema: z.object({
            queries: z.array(z.string()).describe('Array of search queries'),
            limit: z.number().optional().describe('Results per query (default: 5, max: 20)'),
            filters: z.object({
              department: z.string().optional().describe('Filter by department code'),
              language: z.string().optional().describe('Filter by language (zh/en)'),
              semester: z.string().optional().describe('Filter by semester'),
            }).optional(),
          }),
          execute: async ({ queries, limit = 5, filters }) => {
            return await callMCPTool('bulk_search_courses', { queries, limit, filters });
          },
        }),
        
        getGraduationRequirements: tool({
          description: 'Fetch graduation requirements for NTHU departments. Returns PDF URLs and metadata for specific colleges, departments, and entrance years.',
          inputSchema: z.object({
            college: z.string().describe('College name in Chinese (e.g., "電機資訊學院", "理學院", "工學院")'),
            department: z.string().optional().describe('Department or program name in Chinese (e.g., "電機資訊學院學士班", "資訊工程學系"). Optional.'),
            year: z.string().optional().describe('Entrance year (e.g., "111", "112", "113"). Optional.'),
          }),
          execute: async ({ college, department, year }) => {
            return await callMCPTool('get_graduation_requirements', { college, department, year });
          },
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500
    );
  }
});

export default app;
