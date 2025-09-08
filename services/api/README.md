# NTHU Mods API

A comprehensive API for NTHU course management, weather information, venues, and student services built with Hono and TypeScript.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Academic Calendar](#academic-calendar)
  - [Calendar Proxy](#calendar-proxy)
  - [Weather](#weather)
  - [Courses](#courses)
  - [Venues](#venues)
  - [Search](#search)
  - [Model Context Protocol (MCP)](#model-context-protocol-mcp)
  - [Utilities](#utilities)
  - [Issues](#issues)
  - [CCXP Integration](#ccxp-integration)
  - [Planner Synchronization](#planner-synchronization)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)
- [Development](#development)

## Overview

The NTHU Mods API provides access to:

- Course information and scheduling
- Academic calendar events
- Weather forecasts
- Venue information
- Student services integration
- GitHub issue management
- Data synchronization for planner applications
- **Model Context Protocol (MCP) server for AI chatbot integration**
- **Full-text search API powered by Algolia**

**Base URL:** `https://api.nthumods.com`

## Getting Started

### Prerequisites

- Node.js 18+ or Bun runtime
- Valid API keys for external services (when applicable)

### Installation

```bash
npm install
# or
bun install
```

### Environment Variables

Required environment variables:

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key

# External APIs
CALENDAR_API_KEY=your_google_calendar_api_key
CWA_API_KEY=your_taiwan_weather_api_key
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key

# GitHub Integration
GITHUB_CLIENT_ID=your_github_app_client_id
GITHUB_APP_PRIVATE_KEY=your_github_private_key_base64
GITHUB_INSTALLATION_ID=your_github_installation_id

# Authentication
NTHUMODS_AUTH_INTROSPECTION_URL=auth_introspection_endpoint
NTHUMODS_AUTH_CLIENT_ID=auth_client_id
NTHUMODS_AUTH_CLIENT_SECRET=auth_client_secret

# Other Services
TURNSTILE_SECRET_KEY=cloudflare_turnstile_secret
CLOUDFLARE_WORKER_ACCOUNT_ID=cf_account_id
CLOUDFLARE_KV_SHORTLINKS_NAMESPACE=kv_namespace_id
CLOUDFLARE_KV_API_TOKEN=kv_api_token
```

## Authentication

Some endpoints require authentication via Bearer tokens:

```http
Authorization: Bearer your_access_token
```

Authentication is handled through OAuth2 introspection. Protected endpoints include:

- All `/planner/*` endpoints
- Some administrative functions

## API Endpoints

### Academic Calendar

#### Get Academic Calendar Events

```http
GET /acacalendar?start=2024-01-01&end=2024-12-31
```

**Query Parameters:**

- `start` (required): Start date (YYYY-MM-DD)
- `end` (required): End date (YYYY-MM-DD)

**Response:**

```json
[
  {
    "summary": "Spring Semester Begins",
    "date": "2024-02-20",
    "id": "event_id_123"
  }
]
```

### Calendar Proxy

#### Get User Calendar (iCal Format)

```http
GET /calendar/ical/{userId}?key=api_key&type=basic
```

**Parameters:**

- `userId` (path): User identifier
- `key` (query): API key for authentication
- `type` (query): Calendar type (`basic` or `full`, default: `basic`)

**Response:** iCalendar format data

### Weather

#### Get Weather Forecast

```http
GET /weather
```

Returns 5-day weather forecast for NTHU area.

**Response:**

```json
[
  {
    "date": "2024-01-01",
    "weatherData": {
      "MinT": "15",
      "MaxT": "25",
      "PoP12h": "30",
      "Wx": "01",
      "WeatherDescription": "晴時多雲"
    }
  }
]
```

### Courses

#### Get Courses by IDs

```http
GET /course?courses=11410CS 100101
GET /course?courses[]=11410CS 100101&courses[]=11410EE 200201
```

#### Get Course Details

```http
GET /course/{courseId}
```

#### Get Course Syllabus

```http
GET /course/{courseId}/syllabus
```

Returns course with detailed syllabus, scores, and important dates.

#### Get Minimal Course Info

```http
GET /course/{courseId}/minimal
```

Returns essential course information only.

#### Get PTT Reviews

```http
GET /course/{courseId}/ptt
```

Scrapes and returns PTT course reviews.

#### Get Related Courses

```http
GET /course/{courseId}/related
```

Returns courses from previous/future semesters with the same course code.

#### Get All Classes

```http
GET /course/classes
```

Returns list of all available class codes.

#### Get Syllabus PDF

```http
GET /course/{courseId}/syllabus/file
```

Redirects to the course syllabus PDF file.

#### Course Dates Management

```http
GET /course/{courseId}/dates
POST /course/{courseId}/dates
```

Get or update important course dates (POST currently disabled).

### Venues

#### Get All Venues

```http
GET /venue
```

#### Get Courses by Venue

```http
GET /venue/{venueId}/courses?semester=11410
```

### Search

Full-text search API powered by Algolia for searching NTHU courses.

#### Search Courses (GET)

```http
GET /search?q=machine%20learning&limit=10&filters=department:'Computer Science'
```

**Query Parameters:**

- `q` (required): Search query
- `limit` (optional): Number of results (default: 10, max: 100)
- `filters` (optional): Algolia filters
- `facetFilters` (optional): Comma-separated facet filters
- `attributesToRetrieve` (optional): Comma-separated attributes to retrieve

#### Search Courses (POST)

```http
POST /search
Content-Type: application/json

{
  "query": "machine learning",
  "limit": 10,
  "filters": "department:'Computer Science'",
  "facetFilters": ["language:English"],
  "attributesToRetrieve": ["course", "name_zh", "name_en", "teacher_zh", "credits"]
}
```

#### Search API Information

```http
GET /search/info
```

Returns API documentation and usage examples.

### Model Context Protocol (MCP)

MCP server enabling AI chatbots to interact with CourseWeb data using JSON-RPC 2.0.

#### MCP Server Endpoint

```http
POST /mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {},
  "id": 1
}
```

#### Available MCP Methods

- `initialize` - Initialize MCP connection
- `tools/list` - Get available tools
- `resources/list` - Get available resources
- `tools/call` - Call a specific tool
- `resources/read` - Read a specific resource

#### MCP Tools

1. **search_courses** - Search for courses using full-text search
2. **get_course_details** - Get detailed course information
3. **get_course_syllabus** - Get course syllabus with scores and dates
4. **get_multiple_courses** - Get information for multiple courses

#### MCP Resources

1. **courseweb://courses/search** - Search interface documentation
2. **courseweb://courses/all** - Complete list of courses (limited to 1000)

#### MCP Server Information

```http
GET /mcp
```

Returns server capabilities and available tools/resources.

#### Example MCP Tool Call

```http
POST /mcp
Content-Type: application/json

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
  "id": 1
}
```

### Utilities

#### Create Short Link

```http
PUT /shortlink?url=https://example.com/very/long/url
```

**Response:**

```
https://nthumods.com/l/abc123def
```

#### Resolve Short Link

```http
GET /shortlink/{key}
```

### Issues

#### Create GitHub Issue

```http
POST /issue
Content-Type: application/json

{
  "title": "Bug report: Login not working",
  "body": "Detailed description of the issue...",
  "labels": ["bug", "high-priority"],
  "turnstileToken": "optional_turnstile_token"
}
```

#### Get Issues by Tag

```http
GET /issue?tag=bug
```

### CCXP Integration

CCXP (Course and Curriculum eXchange Platform) integration provides access to official NTHU systems.

#### Authentication

```http
POST /ccxp/auth/login
Content-Type: application/x-www-form-urlencoded

studentid=your_student_id&password=your_password
```

#### Get Student Courses

```http
POST /ccxp/courses
Content-Type: application/x-www-form-urlencoded

ACIXSTORE=session_token
```

#### Get Latest Semester Courses

```http
POST /ccxp/courses/latest
```

#### Get Student Grades

```http
POST /ccxp/grades
```

Returns comprehensive grade information including GPA, rankings, and course grades.

#### Additional CCXP Endpoints

- `POST /ccxp/courses/latest-enrollment` - Current enrollment data
- `POST /ccxp/courses/hidden-course-selection` - Hidden course selection data
- `POST /ccxp/courses/class-detailed` - Detailed class information
- `POST /ccxp/eeclass/login` - EEClass OAuth login
- `POST /ccxp/inthu/code` - iNTHU service code generation
- `POST /ccxp/inthu/token` - iNTHU token management
- `POST /ccxp/inthu/door-access-qr` - Door access QR code
- `POST /ccxp/inthu/parcel-information` - Parcel pickup information

### Planner Synchronization

RxDB-compatible synchronization endpoints for the planner application. Requires authentication.

#### Folder Synchronization

```http
GET /planner/folders/pull?id=folder_id&serverTimestamp=2024-01-01T00:00:00Z
POST /planner/folders/push
```

#### Item Synchronization

```http
GET /planner/items/pull?uuid=item_uuid&serverTimestamp=2024-01-01T00:00:00Z
POST /planner/items/push
```

#### Planner Data Synchronization

```http
GET /planner/plannerdata/pull?id=data_id&serverTimestamp=2024-01-01T00:00:00Z
POST /planner/plannerdata/push
```

#### Semester Synchronization

```http
GET /planner/semesters/pull?id=semester_id&serverTimestamp=2024-01-01T00:00:00Z
POST /planner/semesters/push
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

Error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details"
}
```

## Rate Limiting

Rate limiting is applied per IP address:

- Standard endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute
- Heavy operations (scraping): 5 requests per minute

## Examples

### JavaScript/TypeScript

```javascript
// Get course information
const response = await fetch("https://api.nthumods.com/course/11410CS100101");
const course = await response.json();

// Create short link
const shortLinkResponse = await fetch(
  "https://api.nthumods.com/shortlink?url=https://example.com",
  {
    method: "PUT",
  },
);
const shortLink = await shortLinkResponse.text();

// Get weather forecast
const weatherResponse = await fetch("https://api.nthumods.com/weather");
const weather = await weatherResponse.json();
```

### Python

```python
import requests

# Get course information
response = requests.get('https://api.nthumods.com/course/11410CS100101')
course = response.json()

# Create GitHub issue
issue_data = {
    'title': 'Bug report',
    'body': 'Description of the bug',
    'labels': ['bug']
}
response = requests.post('https://api.nthumods.com/issue', json=issue_data)
issue = response.json()
```

### cURL

```bash
# Get weather forecast
curl https://api.nthumods.com/weather

# Get courses by venue
curl "https://api.nthumods.com/venue/綜合一館/courses?semester=11410"

# Create short link
curl -X PUT "https://api.nthumods.com/shortlink?url=https://example.com"
```

## Development

### Local Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun test

# Generate Prisma client
bun run db:generate

# Deploy database migrations
bun run db:push
```

### Project Structure

```
src/
├── config/           # Configuration files (Supabase, Algolia)
├── headless-ais/     # CCXP system integration
├── scheduled/        # Scheduled tasks (syllabus scraping)
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── generated/        # Generated Prisma client
└── prisma/           # Database schema and client

```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in required environment variables
3. Set up Supabase database
4. Configure external service API keys

### Testing

The API includes comprehensive tests for core functionality:

```bash
# Run all tests
bun test

# Run specific test file
bun test src/utils/deepCompare.test.ts

# Run tests in watch mode
bun test --watch
```

### Deployment

The API is designed to run on Cloudflare Workers:

```bash
# Deploy to production
wrangler deploy

# Deploy to staging
wrangler deploy --env staging
```

### Database Schema

The API uses Prisma with SQLite/D1 for data persistence. Key models include:

- `Course` - Course information
- `Folder` - Planner folder structure
- `Item` - Planner items
- `PlannerData` - Planner configuration
- `Semester` - Academic semester data

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Scheduled Tasks

The API includes automated tasks for:

- Course data scraping from CCXP
- Syllabus PDF downloads
- Algolia search index synchronization

These run via Cloudflare Workers Cron Triggers.

## OpenAPI Documentation

Complete OpenAPI 3.0 specification is available in `openapi.yaml`. You can use this with tools like:

- Swagger UI
- Postman
- Insomnia
- API documentation generators

## Support

For issues and questions:

- GitHub Issues: [nthumodifications/courseweb](https://github.com/nthumodifications/courseweb)
- Website: [nthumods.com](https://nthumods.com)

## License

This project is licensed under the MIT License. See the LICENSE file for details.
