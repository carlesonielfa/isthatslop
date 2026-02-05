# Architecture

**Analysis Date:** 2026-02-04

## Pattern Overview

**Overall:** Turborepo monorepo with Next.js 16 frontend and shared packages for database and scoring logic. The architecture follows a Next.js App Router pattern with a centralized Data Access Layer (DAL) for all server-side data operations.

**Key Characteristics:**
- Turborepo-managed monorepo with workspace configuration
- Next.js 16 App Router with React 19 Server Components
- Drizzle ORM with PostgreSQL for data persistence
- Shared packages for database schema and authentication logic
- Better-auth for user authentication and session management
- Clear separation of server-side data fetching (DAL) from client components
- Server Actions for mutations and form submissions

## Layers

**Presentation (Client Components):**
- Purpose: Render UI and handle user interactions
- Location: `apps/web/components/` and `apps/web/app/`
- Contains: React components, page routes, client-side state
- Depends on: Data Access Layer (via imports), UI component library
- Used by: Next.js routing system, browser

**Data Access Layer (DAL):**
- Purpose: Centralized server-side data fetching with caching and error handling
- Location: `apps/web/data/` (contains `sources.ts`, `users.ts`, `actions.ts`)
- Contains: DTO interfaces, `safeQuery` wrapper, Drizzle ORM queries, React cache wrapping
- Depends on: Database package, authentication utilities
- Used by: Server Components and Server Actions
- Key principle: All functions use `import "server-only"` to prevent client-side imports

**Database Layer:**
- Purpose: Schema definitions, ORM configuration, and database connections
- Location: `packages/database/src/`
- Contains: Drizzle ORM schema, relations, migrations, seed scripts
- Depends on: Drizzle ORM, PostgreSQL driver (pg)
- Used by: Data Access Layer, Server Actions

**Authentication & Authorization:**
- Purpose: User session management and role-based access control
- Location: `apps/web/app/lib/auth.server.ts`, `apps/web/app/lib/auth.client.ts`, `apps/web/app/lib/auth.ts`
- Contains: Better-auth setup, session helpers, role checks
- Depends on: Better-auth library, Drizzle user schema
- Used by: All protected routes and actions

**Utilities & Validation:**
- Purpose: Shared business logic and validation
- Location: `apps/web/lib/` (contains `validation.ts`, `scoring.ts`, `tiers.ts`, `reputation.ts`, etc.)
- Contains: Pure functions for scoring, tier calculation, validation
- Depends on: No framework dependencies (testable independently)
- Used by: Components, actions, and data layer

**UI Component Library:**
- Purpose: Reusable UI components with Windows 95 aesthetic
- Location: `apps/web/components/ui/`
- Contains: Base UI and Radix UI wrapped components with CVA variants
- Depends on: CVA, Slot from Radix, Tailwind CSS
- Used by: Page components and feature components

## Data Flow

**Claim Submission Flow:**

1. User fills form in `apps/web/app/claims/new/page.tsx` (Server Component)
2. Form submission calls Server Action `submitClaim()` from `apps/web/data/actions.ts`
3. Server Action validates input using functions from `apps/web/lib/validation.ts`
4. Authenticated user from `getCurrentUser()` (cached server-side)
5. Direct database insert via Drizzle using `db.insert(claims)`
6. Trigger score cache recalculation for the source
7. Revalidate related paths with `revalidatePath()`
8. Return success/error response to client

**Source Browsing Flow:**

1. User navigates to `/sources/[...slug]` (Server Component)
2. Fetch source details using `getSourceDetailDTO()` from `apps/web/data/sources.ts`
3. DTO queries wrapped with React `cache()` for request deduplication
4. Fetch associated claims using `getSourceClaimsDTO()`
5. Pass DTOs (safe data only) to child Client Components
6. Lazy-load child sources via Server Action `fetchSourceChildren()`

**User Profile Flow:**

1. Navigate to `/users/[username]` (Server Component)
2. Fetch profile using `getUserByUsernameDTO()` from `apps/web/data/users.ts`
3. Fetch user's claims and sources in parallel
4. Pass DTOs to UI components
5. Each claim/source card is a Client Component that can interact with Server Actions

**State Management:**

- Server State: Next.js Server Components (default)
- Session State: Better-auth session stored in HTTP-only cookies
- Request-level caching: React `cache()` for per-request deduplication
- URL State: Next.js routing and query parameters
- Mutations: Server Actions with `revalidatePath()` for cache invalidation
- No client-side state management library needed (leverages React 19 Server Components)

## Key Abstractions

**DTO (Data Transfer Objects):**
- Purpose: Safe data contracts for server-to-client communication
- Examples: `SourceDTO`, `UserProfileDTO`, `SourceClaimDTO` in `apps/web/data/sources.ts` and `apps/web/data/users.ts`
- Pattern: Interfaces containing only safe-to-expose fields (no secrets, credentials, internal IDs where unnecessary)
- Benefits: Type safety, documentation, prevents accidental data leaks

**Safe Query Wrapper:**
- Purpose: Graceful error handling for database queries
- Location: `safeQuery()` function in `apps/web/data/sources.ts` and `apps/web/data/users.ts`
- Pattern: Generic async wrapper that catches errors and returns fallback values
- Prevents page crashes if database unavailable; logs errors for debugging

**Validation Functions:**
- Purpose: Decoupled validation logic testable without framework
- Location: `apps/web/lib/validation.ts`
- Contains: `validateImpact()`, `validateConfidence()`, `validateClaimContent()`, etc.
- Pattern: Pure functions returning `ValidationResult` interface

**Score Caching:**
- Purpose: Denormalize tier/score calculations for query performance
- Table: `source_score_cache` in schema
- Updated: On claim submission/deletion via Server Actions
- Accessed: Via `sourceScoreCache` in Drizzle queries

**Materialized Path for Source Hierarchy:**
- Purpose: Enable hierarchical source structure (platform > subreddit > channel)
- Fields: `parentId`, `path` (e.g., "uuid1.uuid2.uuid3"), `depth` (0-5)
- Benefits: Single query to fetch breadcrumb; constraint checking at DB level
- Used in: `apps/web/app/sources/[...slug]/page.tsx` for breadcrumb rendering

## Entry Points

**Web App Entry Point:**
- Location: `apps/web/app/layout.tsx`
- Triggers: Server startup via Next.js
- Responsibilities: Root layout, fonts, styling, Header/Footer wrapper

**Homepage:**
- Location: `apps/web/app/page.tsx`
- Triggers: Request to `/`
- Responsibilities: Fetch site stats, recent sources, hall of fame/shame; render homepage

**API Route for Auth:**
- Location: `apps/web/app/api/auth/[...all]/route.ts`
- Triggers: Better-auth client requests
- Responsibilities: Handle OAuth callbacks, session operations

**Claim Submission:**
- Location: `apps/web/app/claims/new/page.tsx`
- Triggers: User navigates to `/claims/new`
- Responsibilities: Render form, call Server Action on submit

**User Profile:**
- Location: `apps/web/app/users/[username]/page.tsx`
- Triggers: Request to `/users/[username]`
- Responsibilities: Fetch user data, display profile and stats

**Source Detail Page:**
- Location: `apps/web/app/sources/[...slug]/page.tsx`
- Triggers: Request to `/sources/[id]/[slug]` or `/sources/[parent]/[child]/[id]`
- Responsibilities: Fetch source hierarchy, claims, render breadcrumb and tree

## Error Handling

**Strategy:** Graceful degradation with fallbacks and error logging

**Patterns:**
- Database errors caught in `safeQuery()` wrapper; returns fallback data (empty arrays, null objects)
- Form validation errors returned from Server Actions as `{ success: false, error: "message" }`
- Network errors in client components handled via error boundaries (not yet visible in explored code)
- Unauthenticated access checked in Server Actions; returns 403-like error message
- 404 handling for user not found: `apps/web/app/users/[username]/not-found.tsx`

## Cross-Cutting Concerns

**Logging:** Console-based error logging in `safeQuery()` with context prefix; no centralized logging service detected

**Validation:** Input validation in two layers:
- Client: form field validation (visual feedback)
- Server: strict validation in Server Actions and DAL functions before database operations

**Authentication:** Better-auth handles:
- OAuth provider integration (Google, GitHub, Discord)
- Session token management (HTTP-only cookies)
- Email/password authentication
- Server-side helpers: `getCurrentUser()`, `getSession()`, `isModerator()`, `isAdmin()`

**Authorization:** Role-based access control:
- User roles: "member", "moderator", "admin" (in `user.role` column)
- Helper functions check roles before allowing actions
- Example: `isModerator()` and `isAdmin()` in `apps/web/app/lib/auth.server.ts`

**Caching:**
- React `cache()` for per-request deduplication (DAL functions wrapped with `cache()`)
- Next.js `revalidatePath()` for on-demand revalidation after mutations
- Database-level caching: `source_score_cache` table for score/tier data

**Type Safety:**
- TypeScript 5.9.2 strict mode
- Drizzle ORM provides SQL type checking
- DTO interfaces enforce safe data contracts
- Validation functions provide runtime safety

---

*Architecture analysis: 2026-02-04*
