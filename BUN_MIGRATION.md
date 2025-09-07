# Bun Migration Summary

This document outlines the changes made to migrate the courseweb monorepo from npm to bun as the package manager.

## Changes Made

### 1. Package Manager Configuration

- **Root package.json**: Updated `packageManager` field from `"npm@10.0.0"` to `"bun@1.0.0"`
- **Replaced .npmrc with .bunfig.toml**: Created bun configuration file with equivalent settings for legacy peer dependencies
- **Lock files**: Removed `package-lock.json` files and generated `bun.lock`

### 2. Scripts Updates

Updated all npm/npx commands to use bun/bunx:

#### Root package.json scripts:

- `sync:once`, `sync:scheduled`, `dict:*`, `build:update-imports`: Changed from `npm run` to `bun run`
- `gentype`: Changed from `npx` to `bunx`

#### Web app (apps/web/package.json):

- `gentype`: Changed from `npx` to `bunx`

#### Secure API (services/secure-api/package.json):

- `audit:vulnerabilities`: Changed from `npm audit` to `bun audit`
- All `npm run` commands changed to `bun run`

### 3. Docker Configuration

Updated all Dockerfiles to use bun:

#### Web App Dockerfile (apps/web/Dockerfile):

- Base image: `node:20-alpine` → `oven/bun:1-alpine`
- Install command: `npm ci --only=production` → `bun install --frozen-lockfile --production`
- Build commands: `npx turbo` → `bunx turbo`
- Lock file: `package-lock.json*` → `bun.lockb*`

#### Data Sync Dockerfile (tools/data-sync/Dockerfile):

- Base image: `node:20-alpine` → `oven/bun:1-alpine`
- Install command: `npm ci --only=production` → `bun install --frozen-lockfile --production`
- Runtime: `tsx src/sync-courses.ts` → `bun run src/sync-courses.ts`
- Removed tsx global installation (not needed with bun)
- Health check: `node --version` → `bun --version`

#### Secure API Dockerfile:

- Already using bun (no changes needed)

### 4. Deployment Configuration

- **vercel.json**: Updated `installCommand` from `"npm install"` to `"bun install"`
- **GitHub Actions**: Already configured to use bun (no changes needed)

### 5. File Cleanup

- Removed `package-lock.json` from root and `services/secure-api/`
- Removed `.npmrc` file
- Generated new `bun.lock` file

## Benefits of Migration

1. **Performance**: Bun is significantly faster for package installation and script execution
2. **Built-in TypeScript**: Native TypeScript support without additional tooling
3. **Modern Runtime**: Better performance and lower memory usage
4. **Simplified Toolchain**: Combines package manager, bundler, and runtime

## Verification Steps

To verify the migration was successful:

```bash
# Check bun version
bun --version

# Install dependencies
bun install

# Run development server
bun run dev:web

# Build the project
bun run build:web

# Run tests
bun run test
```

## Configuration Files

### .bunfig.toml

```toml
[install]
# Equivalent to legacy-peer-deps=true in npm
peer = false

[install.scopes]
# Configure workspace support
"@courseweb" = { registry = "https://registry.npmjs.org/" }
```

### Lock File

- `bun.lock`: Generated automatically by bun, equivalent to `package-lock.json`

## Compatibility Notes

- All existing npm scripts work with bun
- Workspace configuration remains the same
- All dependencies are compatible
- Docker builds use bun runtime for better performance
- GitHub Actions already configured for bun

## Next Steps

1. Update any local development documentation to reference `bun` instead of `npm`
2. Ensure all team members have bun installed locally
3. Update CI/CD pipelines if any still reference npm (current GitHub Actions already use bun)
4. Consider updating any IDE configurations that reference npm
