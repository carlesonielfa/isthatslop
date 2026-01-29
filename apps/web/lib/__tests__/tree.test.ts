import { describe, it, expect } from "bun:test";
import { buildTree } from "../tree";
import type { SourceTreeNodeDTO } from "@/data/sources";

// Helper to create a source DTO for testing
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

describe("buildTree", () => {
  it("returns empty array for empty input", () => {
    const result = buildTree([]);
    expect(result).toEqual([]);
  });

  it("creates root nodes for sources with no parent", () => {
    const sources = [
      createSource({ id: "1", name: "Reddit" }),
      createSource({ id: "2", name: "Twitter" }),
    ];

    const tree = buildTree(sources);

    expect(tree).toHaveLength(2);
    expect(tree[0]!.name).toBe("Reddit");
    expect(tree[1]!.name).toBe("Twitter");
  });

  it("sorts root nodes alphabetically by name", () => {
    const sources = [
      createSource({ id: "1", name: "Zebra" }),
      createSource({ id: "2", name: "Apple" }),
      createSource({ id: "3", name: "Mango" }),
    ];

    const tree = buildTree(sources);

    expect(tree.map((n) => n.name)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("nests children under their parent", () => {
    const sources = [
      createSource({ id: "reddit", name: "Reddit", depth: 0 }),
      createSource({
        id: "askreddit",
        name: "r/AskReddit",
        depth: 1,
        parentId: "reddit",
      }),
      createSource({
        id: "worldnews",
        name: "r/worldnews",
        depth: 1,
        parentId: "reddit",
      }),
    ];

    const tree = buildTree(sources);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.name).toBe("Reddit");
    expect(tree[0]!.children).toHaveLength(2);
    expect(tree[0]!.children.map((c) => c.name)).toEqual([
      "r/AskReddit",
      "r/worldnews",
    ]);
  });

  it("sorts children alphabetically by name", () => {
    const sources = [
      createSource({ id: "reddit", name: "Reddit" }),
      createSource({ id: "c", name: "C-Sub", parentId: "reddit" }),
      createSource({ id: "a", name: "A-Sub", parentId: "reddit" }),
      createSource({ id: "b", name: "B-Sub", parentId: "reddit" }),
    ];

    const tree = buildTree(sources);

    expect(tree[0]!.children.map((c) => c.name)).toEqual([
      "A-Sub",
      "B-Sub",
      "C-Sub",
    ]);
  });

  it("handles deeply nested hierarchies", () => {
    const sources = [
      createSource({ id: "level0", name: "Level 0", depth: 0 }),
      createSource({
        id: "level1",
        name: "Level 1",
        depth: 1,
        parentId: "level0",
      }),
      createSource({
        id: "level2",
        name: "Level 2",
        depth: 2,
        parentId: "level1",
      }),
      createSource({
        id: "level3",
        name: "Level 3",
        depth: 3,
        parentId: "level2",
      }),
    ];

    const tree = buildTree(sources);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.children[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.children[0]!.children[0]!.name).toBe(
      "Level 3",
    );
  });

  it("treats orphaned children (parent not in list) as roots", () => {
    const sources = [
      createSource({ id: "child", name: "Orphan Child", parentId: "missing" }),
      createSource({ id: "root", name: "Root" }),
    ];

    const tree = buildTree(sources);

    // Both should be at root level since 'missing' parent doesn't exist
    expect(tree).toHaveLength(2);
    expect(tree.map((n) => n.name)).toEqual(["Orphan Child", "Root"]);
  });

  it("preserves all source properties in tree nodes", () => {
    const sources = [
      createSource({
        id: "test",
        name: "Test Source",
        slug: "test-slug",
        type: "platform",
        tier: 3,
        claimCount: 42,
        depth: 0,
        childCount: 5,
        isMatch: false,
      }),
    ];

    const tree = buildTree(sources);

    expect(tree[0]).toMatchObject({
      id: "test",
      name: "Test Source",
      slug: "test-slug",
      type: "platform",
      tier: 3,
      claimCount: 42,
      depth: 0,
      childCount: 5,
      isMatch: false,
    });
  });

  it("initializes children array for all nodes", () => {
    const sources = [createSource({ id: "leaf", name: "Leaf Node" })];

    const tree = buildTree(sources);

    expect(tree[0]!.children).toBeDefined();
    expect(tree[0]!.children).toEqual([]);
  });

  it("handles multiple root hierarchies", () => {
    const sources = [
      createSource({ id: "reddit", name: "Reddit" }),
      createSource({ id: "twitter", name: "Twitter" }),
      createSource({ id: "r-news", name: "r/news", parentId: "reddit" }),
      createSource({ id: "t-user", name: "@user", parentId: "twitter" }),
    ];

    const tree = buildTree(sources);

    expect(tree).toHaveLength(2);
    expect(tree[0]!.name).toBe("Reddit");
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.name).toBe("r/news");
    expect(tree[1]!.name).toBe("Twitter");
    expect(tree[1]!.children).toHaveLength(1);
    expect(tree[1]!.children[0]!.name).toBe("@user");
  });
});
