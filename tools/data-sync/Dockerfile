FROM oven/bun:1-alpine AS base

# Install necessary packages
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy only the workspace package.json that data-sync depends on
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY tools/data-sync/package.json ./tools/data-sync/package.json

# Install dependencies (can't use --frozen-lockfile in Docker with partial monorepo)
RUN bun install

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bunuser -u 1001

# Switch to non-root user before copying files
USER bunuser

# Copy installed node_modules with correct ownership
COPY --from=deps --chown=bunuser:nodejs /app/node_modules ./node_modules

# Copy only the data-sync source code with correct ownership
COPY --chown=bunuser:nodejs tools/data-sync/src ./src
COPY --chown=bunuser:nodejs tools/data-sync/package.json ./package.json
COPY --chown=bunuser:nodejs tools/data-sync/tsconfig.json ./tsconfig.json

# Copy eslint-config if needed at runtime
COPY --chown=bunuser:nodejs packages/eslint-config ./packages/eslint-config

# Default command - run sync once and exit
CMD ["bun", "run", "src/sync-courses.ts"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun --version || exit 1
