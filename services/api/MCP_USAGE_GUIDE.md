# CourseWeb MCP Server Usage Examples

This document provides comprehensive examples for using the CourseWeb MCP (Model Context Protocol) server with AI chatbots.

## Quick Start

The MCP server is available at: `https://api.nthumods.com/mcp`

### Basic MCP Client Connection

```javascript
// Example MCP client connection
const mcpClient = {
  async sendRequest(method, params = {}, id = null) {
    const request = {
      jsonrpc: "2.0",
      method,
      params,
      id: id || Date.now()
    };
    
    const response = await fetch('https://api.nthumods.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    
    return await response.json();
  }
};
```

## MCP Protocol Flow

### 1. Initialize Connection

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {},
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": false },
      "resources": { "subscribe": false, "listChanged": false }
    },
    "serverInfo": {
      "name": "courseweb-mcp-server",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### 2. Discover Available Tools

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": 2
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "search_courses",
        "description": "Search for NTHU courses using full-text search",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Search query for courses"
            },
            "limit": {
              "type": "number",
              "description": "Maximum number of results",
              "minimum": 1,
              "maximum": 50
            }
          },
          "required": ["query"]
        }
      }
    ]
  },
  "id": 2
}
```

## Available Tools

### 1. search_courses

Search for courses using natural language queries.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_courses",
    "arguments": {
      "query": "machine learning artificial intelligence",
      "limit": 5
    }
  },
  "id": 3
}
```

### 2. get_course_details

Get comprehensive information about a specific course.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_course_details",
    "arguments": {
      "courseId": "11410CS 535100"
    }
  },
  "id": 4
}
```

### 3. get_course_syllabus

Retrieve detailed syllabus information including grading and important dates.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_course_syllabus",
    "arguments": {
      "courseId": "11410CS 535100"
    }
  },
  "id": 5
}
```

### 4. get_multiple_courses

Get information for multiple courses at once.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_multiple_courses",
    "arguments": {
      "courseIds": ["11410CS 535100", "11410EE 200201", "11410MATH 101"]
    }
  },
  "id": 6
}
```

## AI Chatbot Integration Examples

### ChatGPT Plugin/GPT Configuration

```yaml
name: NTHU Course Assistant
description: Access NTHU course information, search courses, and get academic details
mcp_server: https://api.nthumods.com/mcp
capabilities:
  - search_courses
  - get_course_details
  - get_course_syllabus
  - get_multiple_courses
```

### Claude MCP Integration

```json
{
  "mcpServers": {
    "courseweb": {
      "command": "node",
      "args": ["mcp-client.js"],
      "env": {
        "MCP_SERVER_URL": "https://api.nthumods.com/mcp"
      }
    }
  }
}
```

### Practical Usage Scenarios

#### Scenario 1: Course Recommendation

**User:** "I'm interested in AI and machine learning courses for next semester"

**AI Assistant using MCP:**
1. Call `search_courses` with query "artificial intelligence machine learning"
2. Get course details for promising results using `get_course_details`
3. Provide formatted recommendations with prerequisites, instructors, and schedules

#### Scenario 2: Academic Planning

**User:** "What are the requirements and grading for CS 535100?"

**AI Assistant using MCP:**
1. Call `get_course_syllabus` with courseId "11410CS 535100"
2. Extract and format syllabus information, grading breakdown, and important dates
3. Present structured academic planning information

#### Scenario 3: Course Comparison

**User:** "Compare these three computer science courses: CS101, CS201, CS301"

**AI Assistant using MCP:**
1. Call `get_multiple_courses` with the course IDs
2. Use `get_course_syllabus` for detailed comparisons
3. Create comparison table with credits, instructors, prerequisites, and content

## Error Handling

The MCP server provides structured error responses:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Course not found: INVALID123",
    "data": "Additional error context"
  },
  "id": 7
}
```

### Common Error Codes

- `-32700`: Parse error (Invalid JSON)
- `-32600`: Invalid request (Invalid JSON-RPC)
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

## Resources

### Available Resources

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {},
  "id": 8
}
```

### Reading Resources

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "courseweb://courses/search"
  },
  "id": 9
}
```

## Search API Integration

For simpler integrations that don't require full MCP protocol:

### Direct Search API

```bash
# Simple course search
curl "https://api.nthumods.com/search?q=machine%20learning&limit=10"

# Advanced search with filters
curl -X POST https://api.nthumods.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence",
    "limit": 5,
    "filters": "department:\"Computer Science\"",
    "facetFilters": ["language:English"]
  }'
```

## Best Practices

### For AI Developers

1. **Initialize First**: Always call `initialize` before using other methods
2. **Handle Errors**: Check for error responses and handle gracefully
3. **Limit Results**: Use reasonable limits to avoid overwhelming responses
4. **Cache Results**: Consider caching course data for better performance
5. **Provide Context**: Give users context about NTHU-specific information

### For Course Queries

1. **Be Specific**: Use specific terms like "machine learning" vs generic terms
2. **Include Context**: Mention department, level, or semester when relevant
3. **Use Multiple Tools**: Combine search with detailed lookups for best results
4. **Validate Course IDs**: Check course ID format before making requests

## Support and Documentation

- **API Base URL**: `https://api.nthumods.com`
- **MCP Endpoint**: `/mcp`
- **Search Endpoint**: `/search`
- **Documentation**: `/mcp` (GET) and `/search/info` (GET)
- **Protocol Version**: MCP 2024-11-05

For technical support or feature requests, please refer to the CourseWeb repository.