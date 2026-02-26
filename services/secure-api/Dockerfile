# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3.4 AS base
WORKDIR /usr/src/app

# Install dependencies only when needed
FROM base AS deps
# Copy root package files
COPY package.json bun.lock ./
COPY turbo.json ./

# Copy workspace package files
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY services/secure-api/package.json ./services/secure-api/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Build dependencies and copy source code
FROM base AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Build shared packages first
RUN cd packages/shared && bun run build || true
RUN cd packages/database && bun run build || true
RUN cd packages/eslint-config && bun run build || true

# Generate Prisma client for secure-api
RUN cd services/secure-api && bun run prisma:generate

# Build secure-api
RUN cd services/secure-api && bun run build || true

# Production image
FROM base AS release
WORKDIR /usr/src/app

# Copy built application and dependencies
COPY --from=builder /usr/src/app/services/secure-api/dist ./dist
COPY --from=builder /usr/src/app/services/secure-api/src ./src
COPY --from=builder /usr/src/app/services/secure-api/package.json .
COPY --from=builder /usr/src/app/services/secure-api/tsconfig.json .
COPY --from=builder /usr/src/app/services/secure-api/prisma ./prisma

# Copy necessary workspace packages
COPY --from=builder /usr/src/app/packages ./packages
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Install production dependencies
RUN bun install --frozen-lockfile --production

# Generate Prisma client in production
RUN bun run prisma:generate

# Run the app
USER bun
EXPOSE 5002/tcp
ENTRYPOINT [ "bun", "run", "start" ]
