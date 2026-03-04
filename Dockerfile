FROM oven/bun:1.3.3-alpine AS base

# ---- Prune ----
FROM base AS pruner
WORKDIR /app
RUN bun install -g turbo
COPY . .
RUN turbo prune web --docker

# ---- Install ----
FROM base AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
WORKDIR /app

COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ENV SKIP_ENV_VALIDATION=1
RUN bun run build --filter=web

# ---- Runner ----
FROM oven/bun:1.3.3-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /usr/src/app

COPY --from=builder --chown=bun:bun /app/apps/web/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=bun:bun /app/apps/web/public ./apps/web/public

# Migration assets
COPY --from=installer --chown=bun:bun /app/node_modules/.bin/drizzle-kit ./node_modules/.bin/drizzle-kit
COPY --from=installer --chown=bun:bun /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=pruner --chown=bun:bun /app/out/full/packages/database ./packages/database

USER bun

EXPOSE 3000/tcp

CMD ["bun", "apps/web/server.js"]
