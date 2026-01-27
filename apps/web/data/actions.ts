"use server";

import { getSourceChildrenDTO } from "./sources";
import type { SourceTreeNodeDTO } from "./sources";

/**
 * Server action to fetch children of a source for lazy loading in the browse tree.
 */
export async function fetchSourceChildren(
  parentId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ children: SourceTreeNodeDTO[]; hasMore: boolean }> {
  return getSourceChildrenDTO(parentId, limit, offset);
}
