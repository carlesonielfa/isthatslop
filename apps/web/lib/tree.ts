import type { SourceTreeNodeDTO } from "@/data/sources";

export interface TreeNode extends SourceTreeNodeDTO {
  children: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  hasMoreChildren?: boolean;
  loadedChildrenCount?: number;
}

/**
 * Builds a tree structure from a flat list of sources.
 * Sources with parentId pointing to another source in the list become children.
 * Sources with no parentId or whose parent isn't in the list become roots.
 */
export function buildTree(sources: SourceTreeNodeDTO[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create nodes
  for (const source of sources) {
    nodeMap.set(source.id, { ...source, children: [] });
  }

  // Second pass: build relationships
  for (const source of sources) {
    const node = nodeMap.get(source.id)!;
    if (source.parentId && nodeMap.has(source.parentId)) {
      nodeMap.get(source.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by name
  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }
  sortChildren(roots);

  return roots;
}
