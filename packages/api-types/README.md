# @courseweb/api-types

TypeScript types and client utilities for CoursWeb API services.

## Overview

This package provides TypeScript type definitions and typed client factory functions for CoursWeb's API services in a monorepo-friendly way. It enables instant type updates across the monorepo without requiring GitHub Actions or external build processes.

## Features

- ✅ **Instant Type Updates**: Types are updated instantly when APIs change (no external build process needed)
- ✅ **Monorepo Optimized**: Works seamlessly within the CoursWeb monorepo structure
- ✅ **Typed Clients**: Provides factory functions for creating typed Hono clients
- ✅ **Zero Dependencies**: Minimal dependencies on API services (no circular imports)
- ✅ **TypeScript Ready**: Full TypeScript support with declaration files

## Installation

In the monorepo, this package is automatically available as a workspace dependency:

```json
{
  "dependencies": {
    "@courseweb/api-types": "*"
  }
}
```

## Usage

### Basic Client Creation

```typescript
import {
  createMainApiClient,
  createSecureApiClient,
} from "@courseweb/api-types";

// Create typed client for main API
const apiClient = createMainApiClient("https://api.nthumods.com");

// Create typed client for secure API
const authClient = createSecureApiClient("https://auth.nthumods.com");

// Now you get full TypeScript intellisense and type checking!
const courses = await apiClient.course.$get({ query: { courses: "CS1010" } });
```

### Using Type Definitions

```typescript
import type { MainApiApp, SecureApiApp } from "@courseweb/api-types";
import { hc } from "hono/client";

// Use types directly with hono/client
const client = hc<MainApiApp>("https://api.example.com");
```

### Bulk Client Creation

```typescript
import { createApiClients } from "@courseweb/api-types";

const clients = createApiClients({
  mainApiUrl: process.env.NEXT_PUBLIC_COURSEWEB_API_URL,
  secureApiUrl: process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL,
});

// Access clients
if (clients.api) {
  const data = await clients.api.course.$get(/* ... */);
}

if (clients.auth) {
  const userInfo = await clients.auth.userinfo.$get();
}
```

## Integration Example

Here's how this package is used in the main web application:

```typescript
// apps/web/src/config/api.ts
import { createMainApiClient } from "@courseweb/api-types";

if (!process.env.NEXT_PUBLIC_COURSEWEB_API_URL) {
  throw new Error("NEXT_PUBLIC_COURSEWEB_API_URL is not defined");
}

const client = createMainApiClient(process.env.NEXT_PUBLIC_COURSEWEB_API_URL);
export default client;
```

```typescript
// apps/web/src/config/auth.ts
import { createSecureApiClient } from "@courseweb/api-types";

if (!process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL) {
  throw new Error("NEXT_PUBLIC_NTHUMODS_AUTH_URL is not defined");
}

const authClient = createSecureApiClient(
  process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL,
);
export default authClient;
```

## Available Types

### Main API Types

- `MainApiApp` - Type for the main CoursWeb API Hono application
- `MainApi` - Alias for `MainApiApp`
- `MainApiClient` - Type for clients created with `createMainApiClient`

### Secure API Types

- `SecureApiApp` - Type for the secure CoursWeb API Hono application
- `SecureApi` - Alias for `SecureApiApp`
- `SecureApiClient` - Type for clients created with `createSecureApiClient`

### Client Utilities

- `ApiClient` - Alias for `MainApiClient`
- `AuthClient` - Alias for `SecureApiClient`
- `ApiClientConfig` - Configuration interface for bulk client creation

## Benefits

### Before (GitHub Actions Approach)

- ⏳ Types synced via GitHub Actions (delayed updates)
- 🔄 Required external build process
- ⚠️ Potential for stale types
- 🚫 No instant feedback during development

### After (Monorepo Integration)

- ⚡ Instant type updates when APIs change
- 🏗️ Integrated into monorepo build pipeline
- ✅ Always up-to-date types
- 🔄 Automatic type checking during development

## Build Integration

This package is integrated into the Turbo build pipeline:

```bash
# Build just the API types
npm run build:api-types

# Build with dependencies (automatic in web app builds)
turbo run build --filter=@courseweb/web
```

## Development

```bash
# Watch mode for development
cd packages/api-types
npm run dev

# Build the package
npm run build

# Type check without emitting files
npm run type-check
```

## Architecture

The package uses a lightweight approach that doesn't require the actual API services to be built:

1. **Generic Type Definitions**: Uses `Hono` generic types rather than importing actual app instances
2. **Independent Build**: Can be built without API service dependencies
3. **Client Factories**: Provides typed client creation functions
4. **Modular Exports**: Clean separation of concerns with dedicated modules

This design ensures the package can be built and used even if the underlying API services have build errors, making it robust for monorepo development workflows.
