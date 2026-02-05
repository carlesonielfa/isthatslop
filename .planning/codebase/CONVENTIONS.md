# Coding Conventions

**Analysis Date:** 2026-02-04

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `Button.tsx`, `ClaimSubmissionForm.tsx`)
- Utilities/helpers: camelCase (e.g., `utils.ts`, `validation.ts`)
- Data access: camelCase with descriptive suffix (e.g., `sources.ts`, `users.ts`, `actions.ts`)
- Tests: `[module].test.ts` format, placed in `__tests__` directory alongside source
- Server utilities: `.server` suffix for server-only files (e.g., `auth.server.ts`)

**Functions:**
- camelCase: `buildTree()`, `validateImpact()`, `getSourceChildrenDTO()`
- Server actions: camelCase: `submitClaim()`, `fetchSourceChildren()`
- Getter functions: `get` prefix (e.g., `getReputationTier()`, `getTierColor()`)
- Validation functions: `validate` prefix (e.g., `validateImpact()`, `validateClaimContent()`)
- Factory/helper functions: `create` prefix (e.g., `createMockChildRow()`)
- Setter functions: Direct assignment, no prefix (e.g., `setupMockDb()`)

**Variables:**
- camelCase for all variables and constants
- UPPER_SNAKE_CASE is avoided in favor of camelCase
- Examples: `tierDescriptions`, `recentSources`, `nodeMap`, `fallback`

**Types/Interfaces:**
- PascalCase with `DTO` suffix for data transfer objects (e.g., `SourceDTO`, `SourceDetailDTO`, `ClaimCommentDTO`)
- PascalCase for general types and interfaces (e.g., `TreeNode`, `ValidationResult`, `SourceClaimSort`)
- Descriptive names reflecting their purpose
- Export pattern: `type SomeType = ...` and `interface SomeInterface { ... }`

**Constants:**
- camelCase: `uuidPattern`, `confidenceLevels`, `impacts`, `tiers`
- Arrays typically exported as const arrays with readonly type patterns
- Examples from codebase: `const impacts = [...]`, `const tiers = [...]`

## Code Style

**Formatting:**
- Prettier v3.7.4 enforces formatting
- Run with `bun run format` to auto-format all `.ts`, `.tsx`, `.md` files
- Line length: No explicit limit enforced, Prettier handles wrapping
- Semicolons: Required (Prettier default)
- Quotes: Double quotes for strings (Prettier default)
- Indentation: 2 spaces

**Linting:**
- ESLint 9.39.1 with flat config
- Shared configurations in `packages/eslint-config/`:
  - `base.js`: Foundation with TypeScript ESLint, Turbo plugin
  - `next.js`: Extends base, adds React, React Hooks, Next.js plugins
  - `react-internal.js`: For internal React libraries
- Run `bun run lint` to check code
- Configuration uses `eslint-config-prettier` to disable Prettier conflicts
- TypeScript ESLint recommended rules enabled by default
- All warnings treated as errors: `--max-warnings 0` enforced in web app

## Import Organization

**Order:**
1. External packages (e.g., `import * as React`, `import Link from "next/link"`)
2. Monorepo packages (e.g., `import { db } from "@repo/database"`)
3. Local absolute imports using `@/` alias (e.g., `import { Button } from "@/components/ui/button"`)
4. Local relative imports not encouraged due to `@/` path alias availability

**Path Aliases:**
- `@/*` maps to root of app (configured in `tsconfig.json`)
- Used extensively: `@/components`, `@/data`, `@/lib`, `@/app`
- Preferred over relative paths for better refactoring and readability

## Error Handling

**Patterns:**
- Server actions return `Result` objects with `success: boolean` and `error?: string` fields
  - Examples: `SubmitClaimResult`, `SubmitReviewResult`
  - Client receives object with clear success state
- Database queries wrapped with `safeQuery()` helper for graceful error handling
  - Located in `apps/web/data/sources.ts`
  - Logs errors to console but returns fallback value to prevent page crashes
- Validation errors: Return `ValidationResult` with `valid: boolean` and `error?: string`
  - Validation before mutations ensures data integrity
  - No exceptions thrown; errors are returned as values
- Try-catch blocks in server actions for database/auth errors
  - Errors logged with context prefix: `[Database Error]`, `[Auth Error]`

## Logging

**Framework:** console (no third-party logging library currently used)

**Patterns:**
- Console errors with context prefix: `console.error('[Database Error] context:', error)`
- No explicit logging library imported; raw console methods used
- Error context includes operation being performed for debugging
- Warnings and info not currently used in codebase

## Comments

**When to Comment:**
- Complex algorithms explained with multi-line comments above function
- Business logic that isn't obvious from code
- Important invariants or side effects (marked with comments above implementation)
- JSDoc blocks for public APIs (especially in `lib/` utilities)

**JSDoc/TSDoc:**
- Used for pure utility functions and public exports
- Pattern: `/** Descriptive text of what function does */`
- Single-line JSDoc for simple functions
- Multi-line for complex functions explaining parameters and behavior
- Examples in `lib/validation.ts`, `lib/tree.ts`
- Not used for component props or internal helpers
- TypeScript types provide self-documentation where possible

## Function Design

**Size:**
- Functions stay reasonably compact (typically under 50 lines)
- Server actions may be longer due to validation chains
- Complex logic extracted to separate functions

**Parameters:**
- Named parameters for functions with multiple arguments
- Input interfaces defined for server actions (e.g., `SubmitClaimInput`)
- Destructured props in React components
- Default parameters used sparingly (example: `safeQuery(fn, fallback, context)`)

**Return Values:**
- Explicit return types required via TypeScript
- DTO interfaces for data returned from server
- Never return raw database objects; always map to DTO
- Void functions explicitly marked `void` in React components
- Server actions return `Result` objects with standardized shape

## Module Design

**Exports:**
- Named exports preferred over default exports
- React components export as named: `export { Button, buttonVariants }`
- Multiple related items grouped together with barrel exports
- DTOs all exported from single `sources.ts` file for consistency

**Barrel Files:**
- Not extensively used; imports specify exact paths
- Component subdirectories import from specific files: `@/components/ui/button`
- Reduces circular dependencies by being explicit

## React/Component Conventions

**Component Naming:**
- PascalCase file names matching component name
- Separate files for subcomponents if used in multiple places
- Example: `SourceRankItem` component defined in `page.tsx` as local component

**Component Types:**
- Async Server Components as default (Next.js 16 with App Router)
- `export default async function HomePage()` pattern for pages
- Named components for reusable UI (`Button`, `Card`, `Badge`)
- Props typed with interfaces (no inline `React.FC<Props>`)

**CVA Usage:**
- Class Variance Authority used for variant-driven component styling
- Pattern: `const buttonVariants = cva(...variants)` then use in component
- Example: `apps/web/components/ui/button.tsx`
- Variants for `variant` and `size` dimensions typical
- Default variants specified in CVA config

**Tailwind CSS:**
- Version 4 in use
- Utility-first approach with `cn()` helper for conditional classes
- `cn()` implemented in `lib/utils.ts` combining `clsx` and `tailwind-merge`
- Long className strings acceptable with Tailwind utilities

## Type Safety

**TypeScript:**
- Version 5.9.2
- `strict` mode enabled via shared config `@repo/typescript-config`
- Explicit return types required for functions
- No implicit `any` types
- DTOs provide type safety between layers
- `type` keyword preferred for simple type aliases, `interface` for object shapes

## Database/ORM

**Query Pattern:**
- Drizzle ORM used with PostgreSQL
- Queries built with chainable methods: `.select().from().where().orderBy().limit().offset()`
- Type-safe queries via Drizzle schema definitions
- Results mapped immediately to DTO interfaces
- Always use `eq()`, `and()`, `or()` from `drizzle-orm` for conditions

---

*Convention analysis: 2026-02-04*
