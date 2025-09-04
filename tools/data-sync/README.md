# @courseweb/data-sync

Course data synchronization tools for CourseWeb monorepo.

## Overview

This package provides utilities for synchronizing course data, syllabus information, and search indices from external sources. It includes both one-time sync scripts and scheduled synchronization functionality.

## Scripts

### Sync Once

Runs a one-time synchronization of course data:

```bash
npm run sync:once
```

This will:

- Scrape archived courses for the current semester
- Download and process syllabus data
- Update Algolia search index

### Scheduled Sync

Runs daily scheduled synchronization (8:00 AM GMT+8):

```bash
npm run sync:scheduled
```

This starts a persistent process that runs the sync operation daily.

## Usage

### From Root Workspace

```bash
# One-time sync
npm run runner:sync-courses

# Scheduled sync (persistent process)
npm run runner:update-courses

# Using workspace commands
npm run sync:once
npm run sync:scheduled
```

### Programmatic Usage

```typescript
import { syncCourses, startScheduledSync } from "@courseweb/data-sync";

// One-time sync
const result = await syncCourses("11320"); // semester parameter optional

// Start scheduled sync
const job = startScheduledSync("0 0 * * *", "11320"); // cron pattern and semester optional
```

## Environment Variables

The sync scripts require the following environment variable:

- `CRON_SECRET`: Bearer token for API authentication

## API Endpoints

The sync process calls the following API endpoints:

- `GET /api/scrape-archived-courses?semester={semester}` - Scrape course data
- `GET /api/scrape-syllabus?semester={semester}` - Download syllabus files
- `GET /api/sync-algolia?semester={semester}` - Update search index

## Configuration

### Default Semester

The default semester is `11320`. You can override this by passing a different semester parameter to the functions.

### Schedule Pattern

The default cron pattern is `0 0 * * *` (daily at midnight UTC, which is 8:00 AM GMT+8).

## Development

```bash
# Build the package
npm run build

# Development mode with watch
npm run dev

# Clean build artifacts
npm run clean

# Lint code
npm run lint

# Type check
npm run type-check
```

## Dependencies

- `node-schedule`: For scheduled job execution
- `tsx`: For TypeScript execution during development

## Notes

- Sync operations have timeout protections (5 minutes for courses, 20 minutes for syllabus)
- All operations include proper error handling and logging
- The scheduled sync process can be stopped with SIGINT (Ctrl+C)
