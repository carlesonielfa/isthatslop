# Testing Patterns

**Analysis Date:** 2026-02-04

## Test Framework

**Runner:**
- Bun 1.3.3 built-in test runner
- Config: No explicit config file; uses Bun's built-in test runner
- Import path: `import { describe, it, expect, mock } from "bun:test"`

**Assertion Library:**
- Bun's built-in assertion library via `expect()` function
- Methods: `toEqual()`, `toHaveLength()`, `toMatchObject()`, `toBe()`, `toBeCloseTo()`, `toBeGreaterThan()`, `toBeNull()`

**Run Commands:**
```bash
bun test              # Run all tests
bun test:run          # Run tests once (explicit command)
```

Note: Tests are run via `bun test` in root package.json. App-specific test scripts in `apps/web/package.json` use `bun test` and `bun test:run`.

## Test File Organization

**Location:**
- Co-located in `__tests__` subdirectories
- Pattern: `src/__tests__/module.test.ts`
- Examples: `apps/web/lib/__tests__/tree.test.ts`, `apps/web/data/__tests__/sources.test.ts`

**Naming:**
- `[module].test.ts` convention
- Tests live alongside implementation files

**Structure:**
```
apps/web/
├── lib/
│   ├── tree.ts
│   └── __tests__/
│       └── tree.test.ts
├── data/
│   ├── sources.ts
│   └── __tests__/
│       ├── sources.test.ts
│       └── db-mock.ts
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect } from "bun:test";
import { buildTree } from "../tree";

describe("buildTree", () => {
  it("returns empty array for empty input", () => {
    const result = buildTree([]);
    expect(result).toEqual([]);
  });

  it("creates root nodes for sources with no parent", () => {
    const sources = [createSource({ id: "1", name: "Reddit" })];
    const tree = buildTree(sources);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.name).toBe("Reddit");
  });
});
```

**Patterns:**
- `describe()` block groups related tests
- `it()` blocks contain individual test cases
- One assertion per test typically, or tightly related assertions
- Non-null assertions (`!`) used with confidence that values exist (known from test setup)
- Test names are descriptive phrases starting with action verb
- Arrange-Act-Assert pattern (setup, call function, verify result)

## Mocking

**Framework:** Bun's built-in `mock()` function from `bun:test`

**Patterns:**

Mocking module-level functions:
```typescript
import { describe, it, expect, mock } from "bun:test";

// Mock before import
mock.module("@repo/database", () => ({
  db: { select: mock(() => {}) },
}));

import { getSourceChildrenDTO } from "../sources";
import { db } from "@repo/database";
```

Mocking Drizzle ORM query chains:
```typescript
function mockQueryChain(result: unknown[]): MockQueryChain {
  const mockOffset = mock(() => Promise.resolve(result));
  const mockLimit = mock(() => ({ offset: mockOffset }));
  const mockOrderBy = mock(() => ({ limit: mockLimit }));
  const mockGroupBy = mock(() => Promise.resolve(result));
  const mockWhere = mock(() => ({
    orderBy: mockOrderBy,
    groupBy: mockGroupBy,
  }));
  const mockLeftJoin = mock(() => ({ where: mockWhere }));
  const mockFrom = mock(() => ({
    leftJoin: mockLeftJoin,
    where: mockWhere,
  }));

  return { from: mockFrom };
}
```

Setting up sequential query results:
```typescript
export function setupMockDb(
  db: { select: any },
  results: unknown[][],
) {
  let callCount = 0;
  db.select.mockImplementation(() => {
    const result = results[callCount] ?? [];
    callCount++;
    return mockQueryChain(result);
  });
}

// Usage in test
setupMockDb(db, [
  [{ id: '1', name: 'Child 1' }],  // First query
  [{ parentId: '1', count: 5 }],   // Second query
]);
```

**What to Mock:**
- Database calls via Drizzle ORM
- External API clients
- Module-level services
- Drizzle query chains for unit testing data access functions

**What NOT to Mock:**
- Pure utility functions (they're fast to test directly)
- Simple validation functions
- Data structure helpers

## Fixtures and Factories

**Test Data:**

Factory pattern for creating mock objects:
```typescript
export function createMockChildRow(overrides: {
  id: string;
  name: string;
  parentId: string;
  tier?: number | null;
  claimCount?: number;
  type?: string;
  depth?: number;
}) {
  return {
    id: overrides.id,
    slug: overrides.id,
    name: overrides.name,
    type: overrides.type ?? "subreddit",
    depth: overrides.depth ?? 1,
    parentId: overrides.parentId,
    tier: "tier" in overrides ? overrides.tier : 3,
    claimCount: overrides.claimCount ?? 0,
  };
}
```

Helper functions in test files:
```typescript
function createSource(
  overrides: Partial<SourceTreeNodeDTO> & { id: string; name: string },
): SourceTreeNodeDTO {
  return {
    slug: overrides.id,
    type: null,
    tier: null,
    claimCount: 0,
    depth: 0,
    parentId: null,
    childCount: 0,
    isMatch: true,
    ...overrides,
  };
}
```

**Location:**
- Factories defined in test files themselves when single-use
- Shared factories in separate files (e.g., `apps/web/data/__tests__/db-mock.ts`)
- Default values provided for optional fields
- Overrides pattern allows specific test variations

## Coverage

**Requirements:** Not enforced; no coverage targets set

**View Coverage:**
- Coverage not currently measured in build process
- No coverage reporting configured

## Test Types

**Unit Tests:**
- Scope: Pure functions, utilities, business logic
- Approach: Test function behavior with various inputs
- Example: `lib/__tests__/tree.test.ts` tests `buildTree()` with different source hierarchies
- Examples: `lib/__tests__/scoring.test.ts` tests score calculation algorithm

**Integration Tests:**
- Scope: Data access functions with mocked database
- Approach: Mock Drizzle ORM chains, test DTO transformation
- Example: `data/__tests__/sources.test.ts` tests `getSourceChildrenDTO()` with mocked queries
- Tests pagination logic (`hasMore` flag)
- Tests null field handling
- Tests DTO mapping from database results

**E2E Tests:**
- Not currently implemented
- No E2E test framework configured

## Common Patterns

**Async Testing:**

```typescript
it("returns children when results <= limit", async () => {
  setupMockDb(db, [children, []]);
  const result = await getSourceChildrenDTO("parent-1", 20, 0);
  expect(result.hasMore).toBe(false);
});
```

- Async test functions marked `async`
- `await` used for async operations
- Mocks set up before calling async function

**Error Testing:**

Not currently tested explicitly, but validation functions return `ValidationResult` with error field:
```typescript
// In codebase, not in tests:
const result = validateImpact(100);
// result = { valid: false, error: "Impact must be between 1 and 5" }
```

Recommend testing error paths:
- Pass invalid inputs to validation functions
- Assert `error` property is populated
- Assert `valid` is false

**Testing Edge Cases:**

Examples from existing tests:
- Empty arrays: `returns empty array for empty input`
- Missing parents: `treats orphaned children (parent not in list) as roots`
- Null values: `handles null tier values`
- Boundary conditions: `normalizedScore closes to expected value (within 3 decimal places)`

## Test Characteristics

**What Tests Cover:**
- Pure utility functions: tree building, scoring calculations
- Data transformation: DTO creation from database results
- Validation logic: input constraints

**What's Not Tested:**
- React components (no component testing framework configured)
- Server actions (could be tested but not currently)
- Database schema (schema tested via migrations in development)
- API endpoints (not present yet; data fetched via DAL)

## Running Tests

**In Development:**
```bash
cd /Users/carles/isthatslop
bun test                    # Run all tests
```

**In CI/CD:**
- Configured via Turborepo
- Command: `bun run test`
- Runs tests for all packages with test scripts

---

*Testing analysis: 2026-02-04*
