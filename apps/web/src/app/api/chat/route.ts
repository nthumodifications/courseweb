import { streamText, convertToCoreMessages, tool, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// MCP Server URL
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || "https://api.nthumods.com/mcp";

// MCP client helper
async function callMCPTool(toolName: string, args: any) {
  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
        id: Date.now(),
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Parse the text content which contains JSON
    const textContent = data.result?.content?.[0]?.text;
    if (textContent) {
      try {
        return JSON.parse(textContent);
      } catch {
        return textContent;
      }
    }
    
    return data.result;
  } catch (error) {
    console.error(`MCP tool call failed: ${toolName}`, error);
    throw error;
  }
}

// Define AI provider configurations
function getAIModel(provider: string, apiKey?: string) {
  switch (provider) {
    case "google":
      const google = createGoogleGenerativeAI({
        apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google("gemini-2.0-flash-exp");
    
    case "openai":
      const openai = createOpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
      });
      return openai("gpt-4o-mini");
    
    case "anthropic":
      const anthropic = createAnthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      });
      return anthropic("claude-3-5-sonnet-20241022");
    
    default:
      // Default to Google Gemini (free tier)
      const defaultGoogle = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return defaultGoogle("gemini-2.0-flash-exp");
  }
}

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are an AI course planning assistant for National Tsing Hua University (NTHU) students, integrated into NTHUMods.

Your primary role is to help students:
1. Plan their course schedules for upcoming semesters
2. Find courses that match their interests and requirements
3. Check graduation requirements based on their department and entrance year
4. Recommend courses based on their academic background
5. Create optimal timetables that avoid conflicts

You have access to tools that allow you to:
- Search for courses by topic, name, or instructor
- Get detailed course information including syllabus and requirements
- Fetch multiple course details at once
- Perform bulk searches with filters

When helping students:
- Ask about their department and entrance year to understand their requirements
- Search for courses using descriptive terms (e.g., "machine learning", "data structures") rather than course codes
- Consider prerequisites and course difficulty
- Help them balance their workload
- Suggest courses that fit their interests and career goals
- Check for time conflicts when building timetables

Important: Always search by course topics, names, or instructors - NOT by course codes like "CS535100". Use the raw_id from search results to get detailed information.

Be friendly, helpful, and proactive in asking clarifying questions to better assist students with their course planning.`;

export async function POST(req: Request) {
  try {
    const { messages, provider = "google", apiKey } = await req.json();

    const model = getAIModel(provider, apiKey);

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: convertToCoreMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        search_courses: tool({
          description:
            "Search for NTHU courses using full-text search. Returns structured course information. Search by course name, topic, or instructor name - NOT by course ID/code. Each result includes raw_id for detailed queries.",
          parameters: z.object({
            query: z
              .string()
              .describe(
                "Search query for courses. Use course name, topic, or instructor name (e.g., 'machine learning', 'John Doe'). Avoid using course codes.",
              ),
            limit: z
              .number()
              .min(1)
              .max(50)
              .optional()
              .describe("Maximum number of results (default: 10)"),
          }),
          execute: async ({ query, limit = 10 }: { query: string; limit?: number }) => {
            const result = await callMCPTool("search_courses", { query, limit });
            return result;
          },
        }),
        get_course_details: tool({
          description:
            "Get detailed information about a specific course by its raw_id (from search results). Returns comprehensive course information.",
          parameters: z.object({
            courseId: z
              .string()
              .describe("Course raw_id from search results (e.g., '11410CS 535100')"),
          }),
          execute: async ({ courseId }: { courseId: string }) => {
            const result = await callMCPTool("get_course_details", { courseId });
            return result;
          },
        }),
        get_course_syllabus: tool({
          description:
            "Get detailed syllabus information including objectives, grading, and important dates. Use raw_id from search results.",
          parameters: z.object({
            courseId: z
              .string()
              .describe("Course raw_id from search results (e.g., '11410CS 535100')"),
          }),
          execute: async ({ courseId }: { courseId: string }) => {
            const result = await callMCPTool("get_course_syllabus", { courseId });
            return result;
          },
        }),
        get_multiple_courses: tool({
          description: "Get information for multiple courses at once by their raw_ids.",
          parameters: z.object({
            courseIds: z
              .array(z.string())
              .describe("Array of course raw_ids (e.g., ['11410CS 535100', '11410EE 200201'])"),
          }),
          execute: async ({ courseIds }: { courseIds: string[] }) => {
            const result = await callMCPTool("get_multiple_courses", { courseIds });
            return result;
          },
        }),
        bulk_search_courses: tool({
          description:
            "Search for courses using multiple queries with optional filters. Perfect for comparing topics.",
          parameters: z.object({
            queries: z
              .array(z.string())
              .describe("Array of search queries (e.g., ['machine learning', 'data science'])"),
            limit: z.number().min(1).max(50).optional().describe("Results per query (default: 5)"),
            filters: z
              .object({
                department: z.string().optional().describe("Department code (e.g., 'CS', 'EE')"),
                language: z.string().optional().describe("Language code (e.g., 'zh', 'en')"),
                semester: z.string().optional().describe("Semester code (e.g., '11410')"),
              })
              .optional()
              .describe("Optional filters to apply to all queries"),
          }),
          execute: async ({ queries, limit = 5, filters }: { queries: string[]; limit?: number; filters?: any }) => {
            const result = await callMCPTool("bulk_search_courses", { queries, limit, filters });
            return result;
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
