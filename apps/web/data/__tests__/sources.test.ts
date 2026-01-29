import { describe, it, expect, mock } from "bun:test";
import { setupMockDb, createMockChildRow } from "./db-mock";

// Mock the database module before importing the functions under test
mock.module("@repo/database", () => ({
  db: { select: mock(() => {}) },
}));

import { getSourceChildrenDTO } from "../sources";
import { db } from "@repo/database";

describe("getSourceChildrenDTO", () => {
  it("returns children with hasMore=false when results <= limit", async () => {
    const children = [
      createMockChildRow({
        id: "child-1",
        name: "Child 1",
        parentId: "parent-1",
        tier: 2,
        claimCount: 10,
      }),
      createMockChildRow({
        id: "child-2",
        name: "Child 2",
        parentId: "parent-1",
        tier: 3,
        claimCount: 5,
      }),
    ];
    setupMockDb(db, [children, []]); // children query, then empty child counts

    const result = await getSourceChildrenDTO("parent-1", 20, 0);

    expect(result.hasMore).toBe(false);
    expect(result.children).toHaveLength(2);
    expect(result.children[0]).toMatchObject({
      id: "child-1",
      name: "Child 1",
      tier: 2,
      claimCount: 10,
      isMatch: true,
    });
  });

  it("returns hasMore=true when results > limit", async () => {
    const children = Array.from({ length: 21 }, (_, i) =>
      createMockChildRow({
        id: `child-${i}`,
        name: `Child ${i}`,
        parentId: "parent-1",
        claimCount: i,
      }),
    );
    setupMockDb(db, [children, []]);

    const result = await getSourceChildrenDTO("parent-1", 20, 0);

    expect(result.hasMore).toBe(true);
    expect(result.children).toHaveLength(20);
  });

  it("includes child counts for each child", async () => {
    const children = [
      createMockChildRow({
        id: "child-1",
        name: "Child 1",
        parentId: "parent-1",
      }),
    ];
    const childCounts = [{ parentId: "child-1", count: 5 }];
    setupMockDb(db, [children, childCounts]);

    const result = await getSourceChildrenDTO("parent-1", 20, 0);

    expect(result.children[0]!.childCount).toBe(5);
  });

  it("handles null tier values", async () => {
    const children = [
      createMockChildRow({
        id: "child-1",
        name: "Child 1",
        parentId: "parent-1",
        tier: null,
      }),
    ];
    setupMockDb(db, [children, []]);

    const result = await getSourceChildrenDTO("parent-1", 20, 0);

    expect(result.children[0]!.tier).toBeNull();
  });

  it("returns empty children array when no results", async () => {
    setupMockDb(db, [[]]);

    const result = await getSourceChildrenDTO("parent-1", 20, 0);

    expect(result.children).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("sets isMatch to true for all lazy-loaded children", async () => {
    const children = [
      createMockChildRow({
        id: "child-1",
        name: "Child 1",
        parentId: "parent-1",
      }),
      createMockChildRow({
        id: "child-2",
        name: "Child 2",
        parentId: "parent-1",
      }),
    ];
    setupMockDb(db, [children, []]);

    const result = await getSourceChildrenDTO("parent-1", 20, 0);

    expect(result.children.every((c) => c.isMatch === true)).toBe(true);
  });
});
