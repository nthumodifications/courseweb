# CourseWeb MCP Server Usage Examples

This document provides comprehensive examples for using the CourseWeb MCP (Model Context Protocol) server with AI chatbots.

## Quick Start

The MCP server is available at: `https://api.nthumods.com/mcp`

**Important Search Guidelines:**

- ✅ **DO** search by course name, topic, or instructor name (e.g., "machine learning", "artificial intelligence", "John Doe")
- ❌ **DON'T** search using course IDs/codes unless specifically needed (e.g., avoid searching "CS535100" directly)
- 💡 Use the `raw_id` from search results with `get_course_details` or `get_course_syllabus` for detailed information

### Basic MCP Client Connection

```javascript
// Example MCP client connection
const mcpClient = {
  async sendRequest(method, params = {}, id = null) {
    const request = {
      jsonrpc: "2.0",
      method,
      params,
      id: id || Date.now(),
    };

    const response = await fetch("https://api.nthumods.com/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    return await response.json();
  },
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

Search for courses using natural language queries. **Returns structured JSON data** with complete course information.

**Important:** Search by course name, topic, or instructor - NOT by course ID/code.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_courses",
    "arguments": {
      "query": "machine learning",
      "limit": 5
    }
  },
  "id": 3
}
```

**Response Structure:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"query\":\"machine learning\",\"total\":2,\"courses\":[{\"raw_id\":\"11420CS 535100\",\"course\":\"CS535100\",\"department\":\"CS\",\"class\":\"00\",\"name_zh\":\"機器學習\",\"name_en\":\"Machine Learning\",\"teacher_zh\":[\"張三\"],\"teacher_en\":[\"John Doe\"],\"credits\":\"3\",\"times\":[\"M3M4\"],\"venues\":[\"台達館105\"],\"language\":\"zh\",\"semester\":\"11420\",\"brief\":\"Introduction to ML\",\"restrictions\":null,\"note\":null,\"prerequisites\":null,\"capacity\":60,\"cross_discipline\":[],\"ge_type\":null}],\"note\":\"Use raw_id with get_course_details or get_course_syllabus for more information\"}"
      }
    ],
    "isError": false
  },
  "id": 3
}
```

**Parsed Response Data:**

- `query`: The search query used
- `total`: Number of results found
- `courses`: Array of course objects, each containing:
  - `raw_id`: Unique course identifier (use with other tools)
  - `course`, `department`, `class`: Course identification
  - `name_zh`, `name_en`: Course names in Chinese and English
  - `teacher_zh`, `teacher_en`: Instructor names
  - `credits`, `times`, `venues`: Scheduling information
  - `language`, `semester`: Course metadata
  - `brief`, `restrictions`, `note`, `prerequisites`: Course details
  - `capacity`, `cross_discipline`, `ge_type`: Additional info

### 2. get_course_details

Get comprehensive information about a specific course using its `raw_id` (obtained from search results). **Returns structured JSON data**.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_course_details",
    "arguments": {
      "courseId": "11420CS 535100"
    }
  },
  "id": 4
}
```

**Response:** Returns complete course information in structured JSON format, including all fields from search plus additional details like `compulsory_for`, `elective_for`, `first_specialization`, `second_specialization`, and `reserve`.

### 3. get_course_syllabus

Retrieve detailed syllabus information including grading breakdown and important dates. Use the `raw_id` from search results.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_course_syllabus",
    "arguments": {
      "courseId": "11420CS 535100"
    }
  },
  "id": 5
}
```

**Response:** Returns structured syllabus data including:

- `syllabus`: objectives, description, requirements, prerequisites, note, restrictions
- `grading`: Array of grading components with type and percentage
- `important_dates`: Array of important dates with title and date
- `scores`: Historical score data (average, std_dev, type)

### 4. get_multiple_courses

Get information for multiple courses at once by their `raw_ids`.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_multiple_courses",
    "arguments": {
      "courseIds": ["11420CS 535100", "11420EE 200201", "11420MATH 101"]
    }
  },
  "id": 6
}
```

**Response:** Returns an array of course objects with complete information for all requested courses.

### 5. bulk_search_courses (NEW!)

Search for courses using multiple query strings and optional filters. **Perfect for comparing different topics** or finding courses across multiple criteria.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "bulk_search_courses",
    "arguments": {
      "queries": [
        "machine learning",
        "data science",
        "artificial intelligence"
      ],
      "limit": 5,
      "filters": {
        "department": "CS",
        "language": "zh",
        "semester": "11420"
      }
    }
  },
  "id": 7
}
```

**Response Structure:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"filters_applied\":{\"department\":\"CS\",\"language\":\"zh\"},\"results\":[{\"query\":\"machine learning\",\"total\":3,\"courses\":[...]},{\"query\":\"data science\",\"total\":2,\"courses\":[...]}],\"note\":\"Use raw_id with get_course_details or get_course_syllabus for more information\"}"
      }
    ],
    "isError": false
  },
  "id": 7
}
```

**Parsed Response Data:**

- `filters_applied`: The filters that were applied to all queries
- `results`: Array of search results, one per query:
  - `query`: The search query
  - `total`: Number of results for this query
  - `courses`: Array of course objects (same structure as `search_courses`)

**Available Filters:**

- `department`: Filter by department code (e.g., "CS", "EE", "MATH")
- `language`: Filter by language (e.g., "zh", "en")
- `semester`: Filter by semester (e.g., "11420", "11420")

## AI Chatbot Integration Examples

### ChatGPT Plugin/GPT Configuration

```yaml
name: NTHU Course Assistant
description: Access NTHU course information, search courses, and get academic details
mcp_server: https://api.nthumods.com/mcp
capabilities:
  - search_courses
  - bulk_search_courses
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
2. Parse the structured JSON response to get `raw_id` for each course
3. Call `get_course_details` for promising results using their `raw_id`
4. Provide formatted recommendations with prerequisites, instructors, schedules, and restrictions

**Example workflow:**

```
Step 1: search_courses("artificial intelligence machine learning", limit=10)
  → Returns structured JSON with courses array containing raw_id for each
Step 2: For top results, get_course_details(raw_id)
  → Returns complete course info including prerequisites, restrictions
Step 3: Present formatted recommendations to user
```

#### Scenario 2: Academic Planning

**User:** "What are the requirements and grading for CS 535100?"

**AI Assistant using MCP:**

1. First search for the course: `search_courses("CS 535", limit=5)` to find the exact `raw_id`
2. Call `get_course_syllabus` with the `raw_id` (e.g., "11420CS 535100")
3. Parse structured JSON response containing syllabus, grading, and important_dates
4. Present formatted academic planning information with grading breakdown

**Note:** While you can search by course code, it's better to search by topic first to find all related courses.

#### Scenario 3: Course Comparison

**User:** "Compare AI-related courses in Computer Science department"

**AI Assistant using MCP:**

1. Call `bulk_search_courses` with queries=["machine learning", "deep learning", "artificial intelligence"] and filters={department: "CS"}
2. Parse the structured results for each query
3. Extract key differences: instructors, credits, prerequisites, schedules
4. Create comparison table showing strengths of each course

**Example:**

```json
{
  "name": "bulk_search_courses",
  "arguments": {
    "queries": ["machine learning", "deep learning", "computer vision"],
    "limit": 3,
    "filters": {
      "department": "CS",
      "semester": "11420"
    }
  }
}
```

#### Scenario 4: Finding Courses by Multiple Criteria (NEW!)

**User:** "Find English-taught CS courses about databases, networks, or security"

**AI Assistant using MCP:**

1. Call `bulk_search_courses` with:
   - queries: ["database", "computer networks", "security"]
   - filters: {department: "CS", language: "en"}
2. Parse all results to get comprehensive course list
3. Use `raw_id` from results to get detailed syllabus for interesting courses
4. Present organized list grouped by topic

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
6. **Parse JSON**: All tool responses return text content containing JSON - parse it to access structured data
7. **Use raw_id**: Always use the `raw_id` field from search results when calling detail/syllabus tools

### For Course Queries

1. ✅ **Search by Topic/Name**: Use course topics, names, or instructor names (e.g., "machine learning", "John Doe")
2. ❌ **Avoid Course Codes in Search**: Don't search by course codes like "CS535100" - search by topic first
3. 🔍 **Use Filters Wisely**: Apply department, language, or semester filters with `bulk_search_courses` for targeted results
4. 📝 **Get Complete Info**: Use `raw_id` from search to call `get_course_details` or `get_course_syllabus` for full information
5. 🔄 **Bulk Operations**: Use `bulk_search_courses` to compare multiple topics efficiently
6. 📊 **Structured Data**: Parse the JSON response text to access structured course information

### Response Data Flow

```
1. search_courses("machine learning")
   ↓ Returns structured JSON with courses array
   ↓ Each course has raw_id field

2. Extract raw_id from results (e.g., "11420CS 535100")
   ↓

3. get_course_details(raw_id) OR get_course_syllabus(raw_id)
   ↓ Returns complete structured course information

4. Parse and present to user
```

### Key Improvements in This Version

- ✨ **Structured JSON Responses**: All tools now return structured JSON instead of plain text
- 🔑 **raw_id Included**: Every course result includes `raw_id` for follow-up queries
- 🔍 **Bulk Search**: New `bulk_search_courses` tool for multi-query searches with filters
- 📚 **Clear Guidelines**: Tool descriptions explicitly guide users to search by topic, not code
- 📊 **Complete Course Data**: All relevant fields from the frontend are now included in responses

## Support and Documentation

- **API Base URL**: `https://api.nthumods.com`
- **MCP Endpoint**: `/mcp`
- **Search Endpoint**: `/search`
- **Documentation**: `/mcp` (GET) and `/search/info` (GET)
- **Protocol Version**: MCP 2024-11-05

For technical support or feature requests, please refer to the CourseWeb repository.
