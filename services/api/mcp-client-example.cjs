/**
 * Simple MCP Client for Testing CourseWeb MCP Server
 * Usage: node mcp-client-example.js
 */

class CourseWebMCPClient {
  constructor(serverUrl = 'https://api.nthumods.com/mcp') {
    this.serverUrl = serverUrl;
    this.requestId = 1;
  }
  
  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: "2.0",
      method,
      params,
      id: this.requestId++
    };
    
    try {
      console.log(`📤 Sending: ${method}`);
      console.log(JSON.stringify(request, null, 2));
      
      // In a real environment, this would make an actual HTTP request
      // For demo purposes, we'll simulate the expected responses
      const response = this.simulateResponse(request);
      
      console.log(`📥 Response:`);
      console.log(JSON.stringify(response, null, 2));
      console.log('---\n');
      
      return response;
    } catch (error) {
      console.error(`❌ Error sending request:`, error);
      return {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error.message
        },
        id: request.id
      };
    }
  }
  
  // Simulate server responses for demo purposes
  simulateResponse(request) {
    const { method, params, id } = request;
    
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false }
            },
            serverInfo: {
              name: "courseweb-mcp-server",
              version: "1.0.0"
            }
          },
          id
        };
        
      case 'tools/list':
        return {
          jsonrpc: "2.0",
          result: {
            tools: [
              {
                name: "search_courses",
                description: "Search for NTHU courses using full-text search",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Search query" },
                    limit: { type: "number", description: "Max results", minimum: 1, maximum: 50 }
                  },
                  required: ["query"]
                }
              },
              {
                name: "get_course_details",
                description: "Get detailed course information",
                inputSchema: {
                  type: "object",
                  properties: {
                    courseId: { type: "string", description: "Course ID" }
                  },
                  required: ["courseId"]
                }
              }
            ]
          },
          id
        };
        
      case 'resources/list':
        return {
          jsonrpc: "2.0",
          result: {
            resources: [
              {
                uri: "courseweb://courses/search",
                name: "Course Search",
                description: "Search interface for NTHU courses",
                mimeType: "application/json"
              },
              {
                uri: "courseweb://courses/all",
                name: "All Courses", 
                description: "Complete list of available courses",
                mimeType: "application/json"
              }
            ]
          },
          id
        };
        
      case 'tools/call':
        const { name, arguments: args } = params;
        
        if (name === 'search_courses') {
          return {
            jsonrpc: "2.0",
            result: {
              content: [{
                type: "text",
                text: `Found courses for "${args.query}":\n\nCS101 - Introduction to Computer Science\nInstructor: Prof. Wang\nCredits: 3\nTime: Mon/Wed 10:20-12:10\n\nCS201 - Data Structures and Algorithms\nInstructor: Prof. Li\nCredits: 3\nTime: Tue/Thu 13:20-15:10`
              }],
              isError: false
            },
            id
          };
        }
        
        if (name === 'get_course_details') {
          return {
            jsonrpc: "2.0",
            result: {
              content: [{
                type: "text", 
                text: `Course Details for ${args.courseId}:\n\nCourse Name: Machine Learning\nInstructor: Prof. Chen\nCredits: 3\nDepartment: Computer Science\nTime: Mon/Wed/Fri 09:10-10:00\nVenue: Delta 101\nLanguage: English\nEnrollment: 45/60\nNote: Prerequisites: Linear Algebra, Statistics`
              }],
              isError: false
            },
            id
          };
        }
        
        return {
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: `Unknown tool: ${name}`
          },
          id
        };
        
      default:
        return {
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
          id
        };
    }
  }
  
  async initialize() {
    console.log('🚀 Initializing MCP connection...\n');
    return await this.sendRequest('initialize');
  }
  
  async listTools() {
    console.log('🔧 Listing available tools...\n');
    return await this.sendRequest('tools/list');
  }
  
  async listResources() {
    console.log('📚 Listing available resources...\n');
    return await this.sendRequest('resources/list');
  }
  
  async searchCourses(query, limit = 10) {
    console.log(`🔍 Searching courses: "${query}"\n`);
    return await this.sendRequest('tools/call', {
      name: 'search_courses',
      arguments: { query, limit }
    });
  }
  
  async getCourseDetails(courseId) {
    console.log(`📖 Getting course details: ${courseId}\n`);
    return await this.sendRequest('tools/call', {
      name: 'get_course_details',
      arguments: { courseId }
    });
  }
}

// Demo usage
async function demo() {
  console.log('CourseWeb MCP Client Demo\n');
  console.log('========================\n');
  
  const client = new CourseWebMCPClient();
  
  // Full MCP workflow demonstration
  await client.initialize();
  await client.listTools();
  await client.listResources();
  
  // Example tool calls
  await client.searchCourses('machine learning', 5);
  await client.getCourseDetails('11410CS 535100');
  
  console.log('✅ Demo completed successfully!');
  console.log('\nTo use with real server:');
  console.log('1. Replace simulateResponse() with actual HTTP requests');
  console.log('2. Handle authentication if required');
  console.log('3. Add error handling and retries');
  console.log('4. Implement proper connection management');
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CourseWebMCPClient;
}

// Run demo if executed directly
if (require.main === module) {
  demo().catch(console.error);
}

// Browser/non-Node.js environment support
if (typeof window !== 'undefined') {
  window.CourseWebMCPClient = CourseWebMCPClient;
}