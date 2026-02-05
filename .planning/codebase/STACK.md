# Technology Stack

**Analysis Date:** 2026-02-04

## Languages

**Primary:**
- TypeScript 5.9.2 - All source code, configuration, and tooling
- JavaScript - Configuration files and tooling

**Secondary:**
- SQL - Database migrations and raw queries via Drizzle ORM

## Runtime

**Environment:**
- Bun 1.3.3 - Primary package manager and runtime
- Node.js >=18 - Fallback compatibility

**Package Manager:**
- Bun 1.3.3 - All dependency management and script execution
- Lockfile: `bun.lock` (present)

## Frameworks

**Core:**
- Next.js 16.1.0 - Server-side rendering, API routes, app-based routing
- React 19.2.0 - UI components and interactive features

**Database & ORM:**
- Drizzle ORM 0.45.1 - TypeScript-first database query builder
- Drizzle Kit 0.31.8 - Database schema migrations and codegen
- PostgreSQL 15 - Primary database (Docker: postgres:15)

**Authentication:**
- better-auth 1.4.17 - User authentication and session management with OAuth support
- better-auth/plugins - Username plugin for username/display-username functionality

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- @tailwindcss/postcss 4 - PostCSS integration for Tailwind
- Base UI 1.1.0 - Unstyled, accessible components (formerly Material-UI Base)
- Radix UI 1.4.3 - Unstyled primitive components library
- shadcn 3.7.0 - Component CLI and utilities
- Class Variance Authority 0.7.1 - Component variant composition library
- @phosphor-icons/react 2.1.10 - Icon library

**Testing:**
- Vitest 4.0.18 - Unit test runner and framework
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/dom 10.4.1 - DOM testing utilities
- jsdom 27.4.0 - DOM implementation for Node.js testing

**Build & Dev Tools:**
- Turbo 2.7.5 - Monorepo task orchestration and caching
- Turborepo with task caching - For build, lint, check-types, test, dev tasks
- TypeScript ESLint 8.50.0 - TypeScript-aware linting
- ESLint 9.39.1 - JavaScript/TypeScript code quality
- Prettier 3.7.4 - Code formatting (no config file, uses defaults)
- Tailwind CSS Compiler - Integrated PostCSS support
- dotenv 17.2.3 - Environment variable loading

**Supporting Libraries:**
- pg 8.17.2 - PostgreSQL client
- date-fns 4.1.0 - Date formatting and manipulation
- clsx 2.1.1 - Conditional className utilities
- tailwind-merge 3.4.0 - Tailwind CSS class merging
- server-only 0.0.1 - Prevents client-side imports of server modules
- tw-animate-css 1.4.0 - Animation utilities
- @types/pg 8.16.0 - Type definitions for PostgreSQL client
- @types/node 22.15.3 - Node.js type definitions
- @types/react 19.2.2 - React type definitions
- @types/react-dom 19.2.2 - React DOM type definitions
- @types/bun 1.3.6 - Bun runtime type definitions

## Configuration

**Environment:**
- Configuration via environment variables defined in `turbo.json` globalEnv
- `.env` file in monorepo root (not committed, example in `.env.example`)
- Dotenv loaded automatically by bun runtime and explicitly in config files
- Database URL: `DATABASE_URL`
- Auth configuration variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- OAuth provider variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`

**Build:**
- `turbo.json` - Task graph, caching, and environment variable declarations
- `next.config.js` (`apps/web/next.config.js`) - Next.js configuration with package transpilation
- `drizzle.config.ts` (`packages/database/drizzle.config.ts`) - Drizzle ORM and migration configuration
- `tsconfig.json` - Shared TypeScript configuration in `packages/typescript-config`
- `eslint.config.js` - Shared ESLint configuration in `packages/eslint-config` with base, next-js, and react-internal configs
- `.npmrc` - Empty npm configuration file (using Bun instead)

## Platform Requirements

**Development:**
- Bun 1.3.3
- Node.js >=18
- Docker (for PostgreSQL and Redis containers via `tools/docker-isthatslop-local/compose.yml`)
- PostgreSQL 15 (via Docker)
- Redis 7 (via Docker, optional for caching but configured)

**Production:**
- Node.js >=18 (for Next.js deployment)
- PostgreSQL 15+ (required for production database)
- Redis optional (if caching strategy is implemented)
- Web deployment platform supporting Node.js/Next.js (Vercel, self-hosted, etc.)

## Monorepo Structure

**Apps:**
- `apps/web` - Next.js 16 frontend application with React 19

**Packages:**
- `packages/database` - Drizzle ORM schema definitions and database client
- `packages/scoring` - Shared scoring logic and utilities
- `packages/eslint-config` - Shared ESLint configurations
- `packages/typescript-config` - Shared TypeScript configurations

**Workspace Configuration:**
- Bun workspaces for monorepo management
- Turbo for task orchestration and caching
- Internal packages prefixed with `@repo/` (e.g., `@repo/database`)

---

*Stack analysis: 2026-02-04*
