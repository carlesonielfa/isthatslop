FROM oven/bun:1.3.3-alpine AS base
WORKDIR /usr/src/app

# ---- Install ----
FROM base AS install

COPY package.json bun.lock* turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile

# ---- Builder ----
FROM base AS builder

COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=install /usr/src/app/apps/web/node_modules ./apps/web/node_modules
COPY . .

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

COPY --from=builder --chown=bun:bun /usr/src/app/apps/web/.next/standalone ./
COPY --from=builder --chown=bun:bun /usr/src/app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=bun:bun /usr/src/app/apps/web/public ./apps/web/public

USER bun

EXPOSE 3000/tcp

CMD ["bun", "apps/web/server.js"]
