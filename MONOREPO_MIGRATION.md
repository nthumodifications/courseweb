# Monorepo Migration Plan

This document outlines the complete migration plan for reorganizing the courseweb project into a well-structured monorepo. This migration will improve code organization, enable better code sharing, and provide a foundation for scaling the project.

## Overview

We're migrating from a flat repository structure to a modern monorepo using:

- **Turborepo** for build orchestration and caching
- **npm workspaces** for dependency management
- **Clear separation** between apps, services, packages, and tools

## Target Structure

```
courseweb/
├── apps/
│   ├── web/                    # Main Next.js web application
│   ├── mobile/                 # Capacitor mobile app
│   ├── admin/                  # Future admin dashboard
│   └── docs/                   # Documentation site
├── services/
│   ├── api/                    # Cloudflare Workers API
│   ├── secure-api/             # Bun/Hono secure API
│   └── discord-bot/            # Discord bot service
├── packages/
│   ├── ui/                     # Shared React components
│   ├── shared/                 # Shared utilities & configs
│   ├── database/               # Database schemas & migrations
│   └── eslint-config/          # Shared ESLint configuration
├── tools/
│   ├── data-sync/             # Course sync scripts
│   ├── dict-manager/          # Translation dictionary tools
│   └── build-scripts/         # Build and deployment scripts
├── package.json               # Root package.json with workspaces
├── turbo.json                 # Turborepo configuration
└── tsconfig.json              # Base TypeScript config
```

## Migration Phases

### Phase 1: Setup Monorepo Infrastructure ✅ IN PROGRESS

**Status**: In Progress  
**Branch**: `chore/monorepo`  
**Description**: Establish the monorepo foundation with proper tooling and configuration.

**Tasks**:

- [x] Create migration branch
- [ ] Setup root package.json with workspaces
- [ ] Install and configure Turborepo
- [ ] Create base TypeScript configuration
- [ ] Setup shared ESLint configuration
- [ ] Create directory structure
- [ ] Update .gitignore for monorepo structure

**Files to create/modify**:

- `package.json` (root - add workspaces config)
- `turbo.json` (new)
- `tsconfig.json` (base config)
- `packages/eslint-config/package.json` (new)
- `packages/eslint-config/index.js` (new)

---

### Phase 2: Extract Shared Components

**Status**: Pending  
**Branch**: TBD  
**Description**: Move reusable React components to a shared UI package.

**Tasks**:

- [ ] Create `packages/ui` directory structure
- [ ] Move components from `src/components/ui` to `packages/ui`
- [ ] Move other reusable components (Alerts, Animation, Forms, etc.)
- [ ] Setup package.json for UI package
- [ ] Configure build system for UI package
- [ ] Update imports in main app
- [ ] Test component functionality

**Key Components to Move**:

- `src/components/ui/*` → `packages/ui/src/components/ui/`
- `src/components/Forms/*` → `packages/ui/src/components/Forms/`
- `src/components/Alerts/*` → `packages/ui/src/components/Alerts/`
- And other reusable components

---

### Phase 3: Migrate Main Application

**Status**: Pending  
**Branch**: TBD  
**Description**: Move the main Next.js application to `apps/web`.

**Tasks**:

- [ ] Create `apps/web` directory
- [ ] Move Next.js app files to `apps/web`
- [ ] Update package.json for web app
- [ ] Update import paths
- [ ] Move app-specific components
- [ ] Update build scripts
- [ ] Test web app functionality
- [ ] Update deployment configuration

**Files to Move**:

- `src/app/*` → `apps/web/src/app/`
- `public/*` → `apps/web/public/`
- `next.config.js` → `apps/web/next.config.js`
- App-specific components and pages

---

### Phase 4: Migrate Services

**Status**: Pending  
**Branch**: TBD  
**Description**: Move API services to the `services/` directory.

**Tasks**:

- [ ] Create `services/api` from `libs/api`
- [ ] Create `services/secure-api` from `libs/secure-api`
- [ ] Create `services/discord-bot` structure
- [ ] Update package.json for each service
- [ ] Update deployment configurations
- [ ] Test API functionality
- [ ] Update CI/CD pipelines

**Services to Migrate**:

- `libs/api/*` → `services/api/`
- `libs/secure-api/*` → `services/secure-api/`
- Create `services/discord-bot/` (currently empty)

---

### Phase 5: Create Shared Utilities Package

**Status**: Pending  
**Branch**: TBD  
**Description**: Extract shared utilities, types, and configurations.

**Tasks**:

- [ ] Create `packages/shared` structure
- [ ] Move shared types and utilities
- [ ] Move shared constants and configuration
- [ ] Create database package from database files
- [ ] Update imports across all packages
- [ ] Test shared functionality

**Files to Move**:

- `src/types/*` → `packages/shared/src/types/`
- `src/helpers/*` → `packages/shared/src/utils/`
- `src/const/*` → `packages/shared/src/constants/`
- `src/config/*` → `packages/shared/src/config/`
- `database/*` → `packages/database/`

---

### Phase 6: Migrate Tools and Scripts

**Status**: Pending  
**Branch**: TBD  
**Description**: Organize development tools and scripts.

**Tasks**:

- [ ] Create `tools/data-sync` from runners
- [ ] Create `tools/dict-manager` from scripts
- [ ] Create `tools/build-scripts` for deployment
- [ ] Update package.json scripts
- [ ] Test all tools functionality
- [ ] Update documentation

**Files to Move**:

- `runners/*` → `tools/data-sync/`
- `scripts/*` → `tools/dict-manager/`
- Create build and deployment scripts in `tools/build-scripts/`

---

### Phase 7: Mobile App Migration

**Status**: Pending  
**Branch**: TBD  
**Description**: Move mobile-specific files to `apps/mobile`.

**Tasks**:

- [ ] Create `apps/mobile` structure
- [ ] Move Capacitor configuration
- [ ] Move iOS and Android specific files
- [ ] Update mobile build scripts
- [ ] Test mobile functionality
- [ ] Update mobile deployment

**Files to Move**:

- `android/*` → `apps/mobile/android/`
- `ios/*` → `apps/mobile/ios/`
- `capacitor.config.ts` → `apps/mobile/capacitor.config.ts`
- `ionic.config.json` → `apps/mobile/ionic.config.json`

---

### Phase 8: Final Cleanup and Testing

**Status**: Pending  
**Branch**: TBD  
**Description**: Clean up remaining files and ensure everything works.

**Tasks**:

- [ ] Remove old directory structures
- [ ] Update all documentation
- [ ] Update CI/CD pipelines
- [ ] Test complete build process
- [ ] Update deployment scripts
- [ ] Verify all functionality works
- [ ] Update README.md

## How to Continue This Migration

### For New Contributors/Threads

1. **Check Current Status**: Look at the phase status above to see what's completed
2. **Review Branch**: Each phase should ideally be done in a separate branch
3. **Follow Phase Order**: Complete phases in order as they build on each other
4. **Test Thoroughly**: Each phase should maintain functionality
5. **Update Status**: Update this document as phases are completed

### Current State (Phase 1)

**Branch**: `chore/monorepo`  
**Next Steps**:

1. Setup root package.json with workspaces configuration
2. Install Turborepo and create turbo.json
3. Create base TypeScript configuration
4. Setup shared ESLint configuration package
5. Create directory structure

### Commands for Phase 1

```bash
# Install Turborepo
npm install --save-dev turbo

# Create package structure
mkdir -p apps/{web,mobile,admin,docs}
mkdir -p services/{api,secure-api,discord-bot}
mkdir -p packages/{ui,shared,database,eslint-config}
mkdir -p tools/{data-sync,dict-manager,build-scripts}
```

## Benefits After Migration

1. **Better Code Organization**: Clear separation of concerns
2. **Improved Code Sharing**: Shared components and utilities
3. **Faster Builds**: Turborepo caching and parallel execution
4. **Easier Scaling**: Simple to add new apps or services
5. **Better Developer Experience**: Consistent tooling across packages
6. **Cleaner Dependencies**: Proper workspace dependency management

## Rollback Plan

If issues arise during migration:

1. Each phase should be in a separate branch for easy rollback
2. Keep the original main branch intact until migration is complete
3. Test functionality after each phase
4. Document any breaking changes or issues

## Post-Migration Tasks

After successful migration:

- [ ] Update deployment pipelines
- [ ] Update development documentation
- [ ] Train team on new structure
- [ ] Update contributing guidelines
- [ ] Consider setting up automated dependency updates
- [ ] Setup cross-package testing strategies

---

**Last Updated**: 2024-12-19  
**Migration Started**: 2024-12-19  
**Estimated Completion**: TBD
