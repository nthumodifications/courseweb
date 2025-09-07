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
COPY turbo.json ./

# Copy workspace package files
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY tools/data-sync/package.json ./tools/data-sync/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Build dependencies and copy source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared packages first
RUN cd packages/shared && bun run build || true
RUN cd packages/database && bun run build || true
RUN cd packages/eslint-config && bun run build || true

# Build data-sync
RUN cd tools/data-sync && bun run build || true

# Production image
FROM base AS runner
WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/tools/data-sync/src ./src
COPY --from=builder /app/tools/data-sync/package.json .
COPY --from=builder /app/tools/data-sync/tsconfig.json .

# Copy necessary workspace packages
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

# Install production dependencies
RUN bun install --frozen-lockfile --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose health check endpoint (optional)
EXPOSE 3000

# Default command - run sync once and exit
CMD ["bun", "run", "src/sync-courses.ts"]

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun --version || exit 1
