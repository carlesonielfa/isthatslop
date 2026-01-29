"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CaretRightIcon,
  CaretDownIcon,
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { buildTree, type TreeNode } from "@/lib/tree";
import type { SourceTreeNodeDTO } from "@/data/sources";
import { fetchSourceChildren } from "@/data/actions";
import { TierBadge } from "@/components/tier-badge";

interface SourceTreeProps {
  sources: SourceTreeNodeDTO[];
}

function TreeNodeRow({
  node,
  level,
  expandedIds,
  loadingIds,
  onToggle,
  onLoadMore,
}: {
  node: TreeNode;
  level: number;
  expandedIds: Set<string>;
  loadingIds: Set<string>;
  onToggle: (id: string) => void;
  onLoadMore: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isLoading = loadingIds.has(node.id);
  const hasChildren = node.children.length > 0 || node.childCount > 0;
  const paddingLeft = level * 20;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 border-b border-border-dark/20 last:border-b-0",
          !node.isMatch && "opacity-60",
        )}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        {/* Expand/Collapse toggle */}
        <button
          onClick={() => hasChildren && !isLoading && onToggle(node.id)}
          className={`flex items-center justify-center w-4 h-4 ${hasChildren && !isLoading ? "cursor-pointer hover:bg-muted" : "cursor-default"}`}
          disabled={!hasChildren || isLoading}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={
            isLoading ? "Loading" : isExpanded ? "Collapse" : "Expand"
          }
        >
          {isLoading ? (
            <SpinnerIcon className="size-3 animate-spin" />
          ) : hasChildren ? (
            isExpanded ? (
              <CaretDownIcon className="size-3" />
            ) : (
              <CaretRightIcon className="size-3" />
            )
          ) : null}
        </button>

        {/* Icon */}
        <span className="text-muted-foreground">
          {hasChildren ? (
            isExpanded ? (
              <FolderOpenIcon className="size-4" />
            ) : (
              <FolderIcon className="size-4" />
            )
          ) : (
            <FileIcon className="size-4" />
          )}
        </span>

        {/* Tier badge */}
        <TierBadge tier={node.tier} size="sm" />

        {/* Name */}
        <Link
          href={`/sources/${node.id}/${node.slug}`}
          className={cn(
            "hover:underline text-sm flex-1 min-w-0 truncate",
            node.isMatch ? "text-accent font-medium" : "text-muted-foreground",
          )}
        >
          {node.name}
        </Link>

        {/* Type badge */}
        {node.type && (
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted">
            {node.type}
          </span>
        )}

        {/* Claim count */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {node.claimCount} claims
        </span>

        {/* Child count indicator */}
        {node.childCount > 0 && !isExpanded && (
          <span className="text-xs text-muted-foreground">
            +{node.childCount}
          </span>
        )}
      </div>

      {/* Render children if expanded */}
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            level={level + 1}
            expandedIds={expandedIds}
            loadingIds={loadingIds}
            onToggle={onToggle}
            onLoadMore={onLoadMore}
          />
        ))}

      {/* Load more button if there are more children */}
      {isExpanded && node.hasMoreChildren && (
        <div
          className="flex items-center gap-2 py-1.5 px-2 text-xs text-accent hover:underline cursor-pointer"
          style={{ paddingLeft: `${(level + 1) * 20 + 28}px` }}
          onClick={() => onLoadMore(node.id)}
        >
          Load more ({node.childCount - (node.loadedChildrenCount ?? 0)}{" "}
          remaining)
        </div>
      )}
    </>
  );
}

export function SourceTree({ sources }: SourceTreeProps) {
  // Store dynamically loaded children separately from initial sources
  const [dynamicChildren, setDynamicChildren] = useState<
    Map<string, { children: SourceTreeNodeDTO[]; hasMore: boolean }>
  >(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Build tree combining initial sources with dynamically loaded children
  const tree = useMemo(() => {
    // Create a combined sources array with dynamic children
    const allSources = [...sources];

    // Add dynamically loaded children
    for (const [, data] of dynamicChildren) {
      for (const child of data.children) {
        if (!allSources.some((s) => s.id === child.id)) {
          allSources.push(child);
        }
      }
    }

    const builtTree = buildTree(allSources);

    // Mark nodes with hasMoreChildren based on dynamic loading state
    function markHasMore(nodes: TreeNode[]) {
      for (const node of nodes) {
        const dynamicData = dynamicChildren.get(node.id);
        if (dynamicData) {
          node.hasMoreChildren = dynamicData.hasMore;
          node.loadedChildrenCount = dynamicData.children.length;
        } else if (node.childCount > node.children.length) {
          // Has children that haven't been loaded yet
          node.hasMoreChildren = true;
          node.loadedChildrenCount = node.children.length;
        }
        markHasMore(node.children);
      }
    }
    markHasMore(builtTree);

    return builtTree;
  }, [sources, dynamicChildren]);

  // Auto-expand ancestors of matched items when there's a search
  const hasSearch = sources.some((s) => !s.isMatch);
  const initialExpanded = useMemo(() => {
    if (!hasSearch) return new Set<string>();
    // Expand all ancestors (non-match items) so matches are visible
    return new Set(sources.filter((s) => !s.isMatch).map((s) => s.id));
  }, [sources, hasSearch]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);

  // Update expanded state when search changes
  useEffect(() => {
    setExpandedIds(initialExpanded);
    // Clear dynamic children when search changes
    setDynamicChildren(new Map());
  }, [initialExpanded]);

  // Fetch children for a node using server action
  const loadChildren = useCallback(
    async (nodeId: string, offset: number = 0) => {
      setLoadingIds((prev) => new Set(prev).add(nodeId));

      try {
        const data = await fetchSourceChildren(nodeId, 20, offset);

        setDynamicChildren((prev) => {
          const next = new Map(prev);
          const existing = next.get(nodeId);
          if (existing && offset > 0) {
            // Append to existing children
            next.set(nodeId, {
              children: [...existing.children, ...data.children],
              hasMore: data.hasMore,
            });
          } else {
            next.set(nodeId, data);
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to load children:", error);
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [],
  );

  // Find a node in the tree by id
  const findNode = useCallback(
    (id: string, nodes: TreeNode[] = tree): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(id, node.children);
        if (found) return found;
      }
      return null;
    },
    [tree],
  );

  function handleToggle(id: string) {
    const isCurrentlyExpanded = expandedIds.has(id);

    if (!isCurrentlyExpanded) {
      // Expanding - check if we need to load children
      const node = findNode(id);
      if (node && node.childCount > 0 && node.children.length === 0) {
        // Need to fetch children
        loadChildren(id);
      }
    }

    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleLoadMore(id: string) {
    const node = findNode(id);
    if (node) {
      const loadedCount = node.loadedChildrenCount ?? node.children.length;
      loadChildren(id, loadedCount);
    }
  }

  function expandAll() {
    const allIds = new Set(sources.map((s) => s.id));
    setExpandedIds(allIds);
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <div>
      {/* Tree controls */}
      <div className="flex gap-2 mb-2 text-xs">
        <button onClick={expandAll} className="text-accent hover:underline">
          Expand All
        </button>
        <span className="text-muted-foreground">|</span>
        <button onClick={collapseAll} className="text-accent hover:underline">
          Collapse All
        </button>
      </div>

      {/* Tree nodes */}
      <div>
        {tree.map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            level={0}
            expandedIds={expandedIds}
            loadingIds={loadingIds}
            onToggle={handleToggle}
            onLoadMore={handleLoadMore}
          />
        ))}
      </div>
    </div>
  );
}
