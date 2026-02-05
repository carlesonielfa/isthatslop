# Codebase Structure

**Analysis Date:** 2026-02-04

## Directory Layout

```
isthatslop/
├── apps/                       # Application packages
│   └── web/                    # Next.js 16 frontend application
│       ├── app/                # Next.js App Router pages and layouts
│       ├── components/         # React components (both UI and feature)
│       ├── data/               # Data Access Layer (server-side queries)
│       ├── lib/                # Utility functions and business logic
│       ├── public/             # Static assets
│       ├── package.json        # Web app dependencies
│       ├── next.config.js      # Next.js configuration
│       ├── tsconfig.json       # TypeScript configuration
│       └── tailwind.config.ts  # Tailwind CSS configuration
├── packages/                   # Shared packages
│   ├── database/               # Drizzle ORM schema and client
│   │   ├── src/
│   │   │   ├── schema.ts       # All database table definitions
│   │   │   ├── index.ts        # Database connection and exports
│   │   │   └── seed.ts         # Seed script
│   │   └── drizzle.config.ts   # Drizzle configuration
│   ├── scoring/                # Scoring calculation logic (shared package)
│   ├── eslint-config/          # Shared ESLint rules
│   └── typescript-config/      # Shared TypeScript configs
├── tools/                      # Development tooling
├── docs/                       # Project documentation
├── .planning/                  # GSD planning artifacts
├── turbo.json                  # Turborepo configuration
├── package.json                # Root workspace configuration
└── bun.lock                    # Dependency lockfile (Bun package manager)
```

## Directory Purposes

**`apps/web/`**
- Purpose: Next.js 16 frontend application
- Contains: Page routes, React components, server actions, authentication
- Key files: `app/layout.tsx` (root layout), `app/page.tsx` (homepage)

**`apps/web/app/`**
- Purpose: All Next.js App Router pages and nested layouts
- Contains: Route segments organized by feature/domain
- Pattern: Follows Next.js file-based routing convention

**`apps/web/app/(auth)/`**
- Purpose: Authentication-related pages grouped in a route group
- Contains: `login/`, `signup/`, `forgot-password/`, `reset-password/`
- Pattern: Parentheses denote non-URL route group in Next.js

**`apps/web/app/onboarding/`**
- Purpose: Post-signup user onboarding flows
- Contains: `username/page.tsx`, `profile/page.tsx`
- Triggers: After user creates account via OAuth or email

**`apps/web/app/profile/`**
- Purpose: User profile and settings
- Contains: `page.tsx` (profile view), `settings/page.tsx`
- Access: Authenticated users only

**`apps/web/app/users/[username]/`**
- Purpose: Public user profile pages
- Contains: `page.tsx` (profile display), `not-found.tsx` (404 handler)
- Pattern: Dynamic route using `[username]` segment

**`apps/web/app/sources/[...slug]/`**
- Purpose: Source detail pages with hierarchical routing
- Contains: `page.tsx` (source details and claims)
- Pattern: Catch-all route `[...slug]` handles variable depth paths
- Example URLs: `/sources/123/platform-name`, `/sources/123/platform-name/456/subreddit-name`

**`apps/web/app/claims/new/`**
- Purpose: Claim submission form
- Contains: `page.tsx` (form page)
- Interaction: Form submission via Server Action

**`apps/web/app/reviews/new/`**
- Purpose: Review submission (future feature, not yet implemented)
- Contains: `page.tsx` stub

**`apps/web/app/browse/`**
- Purpose: Source browsing and exploration
- Contains: `page.tsx`, `browse-filters.tsx`, `source-tree.tsx`
- Features: Hierarchical tree view of sources, lazy loading children

**`apps/web/app/api/auth/[...all]/route.ts`**
- Purpose: Better-auth API route handler
- Contains: OAuth callbacks, session endpoints
- Pattern: Catch-all route for auth provider redirects

**`apps/web/components/`**
- Purpose: All React components (both UI primitives and feature components)
- Contains: UI components, domain-specific components, layout components
- Pattern: Mixture of presentational and smart components

**`apps/web/components/ui/`**
- Purpose: Reusable UI component library
- Contains: `button.tsx`, `card.tsx`, `input.tsx`, `dropdown-menu.tsx`, etc.
- Pattern: CVA (Class Variance Authority) for variant composition
- Styling: Tailwind CSS with Windows 95 aesthetic (beveled buttons, sunken inputs)
- Examples:
  - `button.tsx`: Button with variants (default, outline, secondary, ghost, destructive, link)
  - `card.tsx`: Card component with `CardTitleBar` for Windows 95 title bars
  - `input.tsx`: Text input with 3D sunken appearance

**`apps/web/data/`**
- Purpose: Data Access Layer with server-side queries
- Contains: DTO interfaces and fetch functions wrapped with React `cache()`
- Pattern: Functions use `import "server-only"` to prevent client-side imports
- Key files:
  - `sources.ts`: Source-related queries (getSourceDetailDTO, getSourceClaimsDTO, etc.)
  - `users.ts`: User-related queries (getUserByUsernameDTO, getUserClaimsDTO, etc.)
  - `actions.ts`: Server Actions for mutations (submitClaim, voteOnClaim, etc.)

**`apps/web/lib/`**
- Purpose: Utility functions and business logic
- Contains: Pure functions for validation, scoring, formatting
- Key files:
  - `validation.ts`: Input validation (impact, confidence, content length)
  - `scoring.ts`: Claim weight and source tier calculations
  - `tiers.ts`: Tier color mapping and display logic
  - `reputation.ts`: User reputation calculation
  - `auth.ts`: Client-side auth utilities
  - `auth.server.ts`: Server-side session and role helpers
  - `auth.client.ts`: Client-side auth hooks
  - `date.ts`: Date formatting utilities
  - `tree.ts`: Source hierarchy tree building logic
  - `utils.ts`: Common utilities (cn for class merging)

**`packages/database/`**
- Purpose: Shared database layer with Drizzle ORM
- Contains: Schema definitions, migrations, seed scripts
- Key files:
  - `src/schema.ts`: All table definitions using Drizzle pgTable()
  - `src/index.ts`: Database connection pool and exports
  - `src/seed.ts`: Database seeding script
  - `drizzle.config.ts`: Drizzle configuration for migrations

**`packages/scoring/`**
- Purpose: Shared scoring calculation logic
- Contains: Pure functions for claim scoring and tier calculation
- Usage: Imported by web app for both server and client-side calculations

**`packages/eslint-config/`**
- Purpose: Shared ESLint configuration
- Contains: ESLint rules for base, Next.js, and React projects
- Usage: Referenced in `apps/web/.eslintrc.js`

**`packages/typescript-config/`**
- Purpose: Shared TypeScript configuration
- Contains: Base tsconfig with common compiler options
- Usage: Referenced in `apps/web/tsconfig.json` via `extends`

## Key File Locations

**Entry Points:**
- `apps/web/app/layout.tsx`: Root layout (fonts, styling, Header/Footer wrapper)
- `apps/web/app/page.tsx`: Homepage (recent sources, hall of fame/shame, stats)
- `apps/web/app/api/auth/[...all]/route.ts`: Better-auth route handler

**Configuration:**
- `turbo.json`: Turborepo task definitions and global env vars
- `apps/web/next.config.js`: Next.js configuration
- `apps/web/tailwind.config.ts`: Tailwind CSS configuration
- `packages/database/drizzle.config.ts`: Drizzle ORM migration config
- `package.json`: Root workspace definition and scripts

**Core Logic:**
- `packages/database/src/schema.ts`: Database schema (200+ lines of table definitions)
- `apps/web/data/sources.ts`: Source data fetching (DTO interfaces, queries)
- `apps/web/data/users.ts`: User data fetching (profile, claims, sources)
- `apps/web/data/actions.ts`: Server Actions (mutations like submitClaim)
- `apps/web/lib/validation.ts`: Input validation functions
- `apps/web/lib/scoring.ts`: Claim scoring calculations

**Testing:**
- `apps/web/lib/__tests__/`: Unit tests for pure functions
  - `tree.test.ts`: Source hierarchy tree building tests
  - `scoring.test.ts`: Scoring calculation tests
  - `db-mock.ts`: Mock database helpers
- `apps/web/data/__tests__/`: DAL tests
  - `sources.test.ts`: Source query tests

**Styling:**
- `apps/web/app/globals.css`: Global Tailwind CSS styles and Windows 95 theme
- `apps/web/app/page.module.css`: Homepage-specific styles
- Component styles: Inline Tailwind classes in `.tsx` files

## Naming Conventions

**Files:**
- Page files: `page.tsx` (Next.js convention)
- Layout files: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase (e.g., `HeaderComponent.tsx`, `UserAvatar.tsx`)
- Hooks: camelCase with `use` prefix (if using custom hooks)
- Utility files: lowercase with hyphens (e.g., `validation.ts`, `date.ts`)
- Test files: `*.test.ts` or `*.spec.ts` suffix

**Directories:**
- Feature directories: kebab-case (e.g., `claim-submission-form`, `source-tree`)
- Dynamic segments: `[paramName]` or `[...catchAll]`
- Route groups: `(groupName)` (parentheses hide from URL)
- Internal packages: @repo/package-name via workspace import

**Exports:**
- Barrel files: `index.ts` in packages (re-export schema from database package)
- Named exports: `export const`, `export interface`
- Default exports: Minimal usage (Next.js pages use default)

## Where to Add New Code

**New Feature (e.g., voting system):**
- Component: `apps/web/components/feature-name.tsx`
- Page: `apps/web/app/new-route/page.tsx`
- DAL function: `apps/web/data/actions.ts` or new file `apps/web/data/votes.ts`
- Database tables: Add to `packages/database/src/schema.ts`
- Tests: `apps/web/lib/__tests__/feature.test.ts` for logic, `apps/web/data/__tests__/votes.test.ts` for DAL

**New Component/Module:**
- Reusable component: `apps/web/components/component-name.tsx`
- UI component: `apps/web/components/ui/component-name.tsx`
- Layout component: `apps/web/components/layout-name.tsx`
- Feature component: `apps/web/components/feature-name.tsx`

**Utilities & Helpers:**
- Validation logic: `apps/web/lib/validation.ts` (extend existing file)
- Formatting/date utilities: `apps/web/lib/date.ts` or create `apps/web/lib/utils-category.ts`
- Shared scoring: `packages/scoring/src/index.ts`

**Server Actions:**
- Location: `apps/web/data/actions.ts` (centralized) or feature-specific file
- Pattern: Use `"use server"` directive, validate input, call DAL, revalidate paths

**Database Operations:**
- Schema: `packages/database/src/schema.ts` (add pgTable and relations)
- Migrations: Generated via `bun run db:generate` from schema changes
- Seed data: `packages/database/src/seed.ts`

## Special Directories

**`apps/web/.next/`**
- Purpose: Next.js build output and cache
- Generated: Yes (by `next build`)
- Committed: No (in .gitignore)
- Contents: Compiled pages, type information, server components

**`apps/web/public/`**
- Purpose: Static assets served at root
- Generated: No
- Committed: Yes
- Contents: Images, favicons, static files

**`node_modules/`**
- Purpose: Installed dependencies
- Generated: Yes (by `bun install`)
- Committed: No (in .gitignore)
- Note: Bun uses `.bun/` internal cache directory

**`.planning/codebase/`**
- Purpose: GSD planning artifacts and analysis documents
- Generated: Yes (by /gsd commands)
- Committed: Yes (for reference)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONCERNS.md, etc.

**`tools/docker-isthatslop-local/`**
- Purpose: Docker Compose setup for local PostgreSQL development
- Generated: No
- Committed: Yes
- Usage: `bun run compose:up` to start PostgreSQL

**Database Migrations:**
- Location: Not visible in file listing (Drizzle manages migrations)
- Generated: Via `bun run db:generate` from schema changes
- Committed: Typically yes (migrations are source control tracked)

---

*Structure analysis: 2026-02-04*
