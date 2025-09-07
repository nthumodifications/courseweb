# syntax=docker.io/docker/dockerfile:1

FROM oven/bun:1-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy monorepo package files
COPY package.json bun.lockb* ./
COPY turbo.json ./

# Copy workspace package files
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/api-types/package.json ./packages/api-types/package.json
COPY packages/tailwind-config/package.json ./packages/tailwind-config/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy services (git submodules) for type generation
COPY services/api ./services/api
COPY services/secure-api ./services/secure-api

# Build workspace packages first
RUN bunx turbo run build --filter=@courseweb/shared
RUN bunx turbo run build --filter=@courseweb/ui
RUN bunx turbo run build --filter=@courseweb/api-types
RUN bunx turbo run build --filter=@courseweb/database || true
RUN bunx turbo run build --filter=@courseweb/eslint-config || true

# Build web application
RUN bunx turbo run build --filter=@courseweb/web

# Production image, copy all the files and run Next.js
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/web/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Server command expects the Next.js app to be in apps/web directory structure
CMD ["node", "apps/web/server.js"]
