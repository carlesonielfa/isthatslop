FROM oven/bun:1.3.3-alpine AS base
WORKDIR /usr/src/app

# ---- Install (dev) ----
FROM base AS install

# Copy workspace manifests into a temp dir for cached installs
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
COPY turbo.json /temp/dev/
COPY apps/web/package.json /temp/dev/apps/web/
COPY packages/database/package.json /temp/dev/packages/database/
COPY packages/scoring/package.json /temp/dev/packages/scoring/
COPY packages/eslint-config/package.json /temp/dev/packages/eslint-config/
COPY packages/typescript-config/package.json /temp/dev/packages/typescript-config/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production-only deps
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
COPY turbo.json /temp/prod/
COPY apps/web/package.json /temp/prod/apps/web/
COPY packages/database/package.json /temp/prod/packages/database/
COPY packages/scoring/package.json /temp/prod/packages/scoring/
COPY packages/eslint-config/package.json /temp/prod/packages/eslint-config/
COPY packages/typescript-config/package.json /temp/prod/packages/typescript-config/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# ---- Builder ----
FROM base AS builder

COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

# Build the Next.js app via turbo
RUN bun run build --filter=web

# ---- Runner ----
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use the built-in bun user (mirrors the Bun demo pattern)
COPY --from=install --chown=bun:bun /temp/prod/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /usr/src/app/apps/web/public ./apps/web/public
COPY --from=builder --chown=bun:bun /usr/src/app/apps/web/.next/standalone ./
COPY --from=builder --chown=bun:bun /usr/src/app/apps/web/.next/static ./apps/web/.next/static

USER bun

EXPOSE 3000/tcp

CMD ["bun", "apps/web/server.js"]
