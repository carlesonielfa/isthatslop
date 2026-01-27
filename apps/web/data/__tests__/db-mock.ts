import { mock, type Mock } from "bun:test";

// Query chain type for mocked Drizzle queries
interface MockQueryChain {
  from: Mock<() => unknown>;
}

/**
 * Creates a mock query chain that resolves to the given result.
 * Supports the common Drizzle ORM chain: select().from().leftJoin().where().orderBy().limit().offset()
 */
export function mockQueryChain(result: unknown[]): MockQueryChain {
  const mockOffset = mock(() => Promise.resolve(result));
  const mockLimit = mock(() => ({ offset: mockOffset }));
  const mockOrderBy = mock(() => ({ limit: mockLimit }));
  const mockGroupBy = mock(() => Promise.resolve(result));
  const mockWhere = mock(() => ({
    orderBy: mockOrderBy,
    groupBy: mockGroupBy,
  }));
  const mockLeftJoin = mock(() => ({ where: mockWhere }));
  const mockInnerJoin = mock(() => ({ where: mockWhere }));
  const mockFrom = mock(() => ({
    leftJoin: mockLeftJoin,
    innerJoin: mockInnerJoin,
    where: mockWhere,
  }));

  return { from: mockFrom };
}

/**
 * Sets up db.select to return different results for sequential calls.
 * Useful when a function makes multiple queries (e.g., fetch items then fetch counts).
 *
 * @example
 * setupMockDb(db, [
 *   [{ id: '1', name: 'Child 1' }],  // First query returns children
 *   [{ parentId: '1', count: 5 }],   // Second query returns counts
 * ]);
 */
export function setupMockDb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Creates a mock child source row as returned from the database.
 */
export function createMockChildRow(overrides: {
  id: string;
  name: string;
  parentId: string;
  tier?: string | null;
  reviewCount?: number;
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
    tier: "tier" in overrides ? overrides.tier : "3",
    reviewCount: overrides.reviewCount ?? 0,
  };
}
