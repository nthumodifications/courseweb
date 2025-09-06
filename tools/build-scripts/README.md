# @courseweb/build-scripts

Build and deployment scripts for the CourseWeb monorepo.

## Overview

This package provides automation utilities for building, deploying, and managing the CourseWeb monorepo. It includes scripts for import management, build orchestration, and development workflow automation.

## Features

- **Import Management**: Automated import path updates for monorepo migration
- **Build Orchestration**: Unified build commands for all packages
- **Development Tools**: Quality checks, linting, and type checking
- **Deployment Utilities**: Deployment automation scripts

## Scripts

### Import Management

Update import paths after monorepo migrations:

```bash
# Update UI component imports
npm run update:ui-imports

# Update web app imports
npm run update:web-imports
```

### Build Commands

```bash
# Build all packages
npm run build

# Build with watch mode
npm run dev

# Clean all build artifacts
npm run clean

# Lint all packages
npm run lint

# Type check all packages
npm run type-check
```

## Usage

### From Root Workspace

```bash
# Update imports after migration
npm run build:update-imports

# Build specific package
npx turbo run build --filter=@courseweb/web

# Run quality checks
npx turbo run lint
npx turbo run type-check
```

### From Build-Scripts Workspace

```bash
# Navigate to build-scripts directory
cd tools/build-scripts

# Update web app imports
npm run update:web-imports

# Update UI package imports
npm run update:ui-imports
```

### Programmatic Usage

```typescript
import {
  updateUIImports,
  updateWebImports,
  updateAllImports,
  buildPackage,
  buildAll,
  deployWeb,
  runQualityChecks,
} from "@courseweb/build-scripts";

// Update import paths
updateAllImports();

// Build specific package
buildPackage("@courseweb/web");

// Build all packages
buildAll();

// Run quality checks
runQualityChecks();

// Deploy web application
deployWeb();
```

## Import Management Tools

### UI Import Updates (`update-ui-imports.js`)

Updates import paths in the UI package to use relative imports instead of absolute `@/` imports:

- Converts `@/lib/utils` → `../../lib/utils`
- Converts `@/components/` → `../`
- Processes all `.ts` and `.tsx` files recursively

### Web Import Updates (`update-web-imports.js`)

Updates import paths in the web application to use monorepo packages:

- Converts `@/components/ui/*` → `@courseweb/ui`
- Converts `@/lib/utils` → `@courseweb/ui`
- Converts `@/hooks/use-mobile` → `@courseweb/ui`
- Converts `@/components/Animation/*` → `@courseweb/ui`
- Fixes default imports to named imports for Animation components

## Build Orchestration

### Package Building

```typescript
// Build specific package
buildPackage("@courseweb/ui");
buildPackage("@courseweb/web");
buildPackage("@courseweb/api");

// Build all packages
buildAll();
```

### Development Mode

```typescript
// Start development mode for all packages
devAll();
```

### Cleanup

```typescript
// Clean all build artifacts
cleanAll();
```

## Quality Assurance

### Linting

```typescript
// Lint all packages
lintAll();
```

### Type Checking

```typescript
// Type check all packages
typeCheckAll();

// Run combined quality checks
runQualityChecks(); // Runs both linting and type checking
```

## Deployment

### Web Application

```typescript
// Deploy web application
deployWeb(); // Builds and deploys the web app
```

## Configuration

### Turbo Integration

All build commands integrate with Turborepo for:

- Parallel execution
- Intelligent caching
- Dependency graph awareness

### Path Resolution

Import update scripts use relative path resolution from the build-scripts directory:

- UI package: `../../../packages/ui/src`
- Web app: `../../../apps/web/src`

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

- Node.js built-in modules (`child_process`, `path`)
- No external runtime dependencies for core functionality

## File Structure

```
tools/build-scripts/
├── src/
│   ├── index.ts                 # Main export file
│   ├── update-ui-imports.js     # UI import update script
│   └── update-web-imports.js    # Web import update script
├── package.json
├── tsconfig.json
└── README.md
```

## Notes

- Import update scripts are safe to run multiple times
- All operations include error handling and progress logging
- Build commands respect Turborepo's dependency graph
- Scripts work with the monorepo workspace structure
- Import updates preserve code functionality while updating paths

## Integration with Turbo

This package integrates seamlessly with Turborepo tasks defined in `turbo.json`:

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "clean": { "cache": false },
    "update:ui-imports": { "cache": false },
    "update:web-imports": { "cache": false }
  }
}
```
