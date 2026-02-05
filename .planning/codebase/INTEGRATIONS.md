# External Integrations

**Analysis Date:** 2026-02-04

## APIs & External Services

**OAuth/Authentication Providers:**
- Google OAuth
  - SDK/Client: better-auth with google provider
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Configuration: `apps/web/app/lib/auth.ts` lines 26-28

- GitHub OAuth
  - SDK/Client: better-auth with github provider
  - Auth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Configuration: `apps/web/app/lib/auth.ts` lines 30-32

- Discord OAuth
  - SDK/Client: better-auth with discord provider
  - Auth: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
  - Configuration: `apps/web/app/lib/auth.ts` lines 34-36

## Data Storage

**Databases:**
- PostgreSQL 15
  - Connection: `DATABASE_URL` environment variable
  - Client: pg (Node.js PostgreSQL client)
  - ORM: Drizzle ORM 0.45.1
  - Schema location: `packages/database/src/schema.ts`
  - Tables: user, session, account, verification (better-auth managed), sources, claims, claimEvidence, claimVotes, claimComments, flags, moderationLogs, sourceScoreCache
  - Migrations: Drizzle Kit managed in `packages/database/drizzle/` directory
  - Local dev: PostgreSQL 15 via Docker container (see `tools/docker-isthatslop-local/compose.yml`)

**File Storage:**
- Local filesystem only (no remote file storage configured)
- Schema references Backblaze B2 URLs for claim evidence but implementation not completed
- Storage integration not yet implemented (future: evidence uploads)

**Caching:**
- Redis 7 configured in Docker compose but not actively integrated in application code
- Location: `tools/docker-isthatslop-local/compose.yml` port 6379
- Status: Configured but unused (future optimization path)

## Authentication & Identity

**Auth Provider:**
- better-auth 1.4.17 - Custom auth solution built on top of better-auth
- Implementation: Drizzle ORM adapter with better-auth
- Location: `apps/web/app/lib/auth.ts` (server-side), `apps/web/app/lib/auth.client.ts` (client-side)
- API Route: `apps/web/app/api/auth/[...all]/route.ts` (Next.js catch-all route)
- Plugins: username plugin for username/display-username support

**Email Verification:**
- Status: Placeholder implementation (TODO)
- Location: `apps/web/app/lib/auth.ts` lines 18-23
- Intended: Email verification on signup
- Notes: Currently logs to console, requires Resend integration (marked as TODO)

**Password Reset:**
- Status: Placeholder implementation (TODO)
- Location: `apps/web/app/lib/auth.ts` lines 11-16
- Notes: Currently logs to console, requires Resend integration (marked as TODO)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar error tracking service configured

**Logs:**
- Console logging only
- Location: Various TODOs in `apps/web/app/lib/auth.ts` use console.log for auth events
- Notes: Production logging strategy not yet implemented

**Analytics:**
- Not detected - No analytics provider (Segment, Plausible, etc.) configured

## CI/CD & Deployment

**Hosting:**
- Not detected in configuration - Deployment platform not yet configured
- Candidate platforms: Vercel (default for Next.js), self-hosted Node.js server, AWS, etc.

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI/CD configured
- Infrastructure: Ready for CI/CD via Turborepo task definitions

**Package Publishing:**
- Not applicable - Monorepo packages are internal workspaces only, not published to npm

## Environment Configuration

**Required env vars (from turbo.json globalEnv):**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `BETTER_AUTH_SECRET` - Secret key for auth session encryption (required)
- `BETTER_AUTH_URL` - Base URL for auth callbacks (required for production)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional)
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID (optional)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret (optional)
- `DISCORD_CLIENT_ID` - Discord OAuth client ID (optional)
- `DISCORD_CLIENT_SECRET` - Discord OAuth client secret (optional)

**Secrets location:**
- `.env` file in monorepo root (not committed to git, see `.gitignore`)
- Template: `.env.example` (safe to commit)
- Local dev default: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres` (Docker database)

**Optional vars for local development:**
- `POSTGRES_PORT` - Override default 5432 for PostgreSQL container
- `REDIS_PORT` - Override default 6379 for Redis container

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook handlers for external services

**Outgoing:**
- better-auth OAuth callbacks automatically handled via `apps/web/app/api/auth/[...all]/route.ts`
- Future: Email verification/password reset callbacks (marked as TODO, requires Resend integration)

## Planned Integrations

**Email Service (TODO):**
- Integration point: `apps/web/app/lib/auth.ts` lines 13-15 and 19-22
- Service: Resend (recommended for modern email with React templates)
- Functions needed:
  - Email verification sender: `emailVerification.sendVerificationEmail`
  - Password reset sender: `emailAndPassword.sendResetPassword`

**File Storage (TODO):**
- Schema references: `packages/database/src/schema.ts` line 239 (claimEvidence)
- Candidate: Backblaze B2 (mentioned in schema comments)
- Requirement: Evidence upload for claims (images/documents)

---

*Integration audit: 2026-02-04*
