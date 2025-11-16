import { google } from '@ai-sdk/google';
import { streamText, tool, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { z } from 'zod';

// Get API key from environment, with fallback to Gemini free tier
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// MCP server base URL - use the CoursWeb API URL
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_COURSEWEB_API_URL || 'https://api.nthumods.com';

// Helper function to call MCP server
async function callMCPTool(toolName: string, args: any) {
  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP server error: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.error.message);
  }

  // Extract the text content from MCP response
  const content = result.result?.content?.[0]?.text;
  return content ? JSON.parse(content) : null;
}

export async function POST(req: Request) {
  const { messages, userId, userApiKey }: { 
    messages: UIMessage[]; 
    userId?: string;
    userApiKey?: string;
  } = await req.json();

  // Use user-provided API key if available, otherwise use server default
  const effectiveApiKey = userApiKey || apiKey;

  if (!effectiveApiKey) {
    return Response.json(
      { error: 'No API key provided. Please configure your API key in settings.' },
      { status: 400 }
    );
  }

  const result = streamText({
    model: google('gemini-2.0-flash-exp', { 
      apiKey: effectiveApiKey,
    }),
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
    messages: convertToModelMessages(messages),
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
    },
  });

  return result.toUIMessageStreamResponse();
}
