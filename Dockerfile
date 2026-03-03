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

# Install deps from pruned lockfile
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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

USER bun

EXPOSE 3000/tcp

CMD ["bun", "apps/web/server.js"]
