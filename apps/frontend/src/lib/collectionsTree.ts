import type { Collection, SavedRequest } from "../types";

export interface CollectionTreeNode {
  collection: Collection;
  children: CollectionTreeNode[];
  requests: SavedRequest[];
}

/** Assembles the flat `collections`/`requests` lists the backend returns into a nested tree, keyed off `parentId`/`collectionId`. */
export function buildCollectionsTree(collections: Collection[], requests: SavedRequest[]): CollectionTreeNode[] {
  const childrenByParent = new Map<string | null, Collection[]>();
  for (const collection of collections) {
    const siblings = childrenByParent.get(collection.parentId) ?? [];
    siblings.push(collection);
    childrenByParent.set(collection.parentId, siblings);
  }

  const requestsByCollection = new Map<string, SavedRequest[]>();
  for (const request of requests) {
    if (request.collectionId === null) continue;
    const siblings = requestsByCollection.get(request.collectionId) ?? [];
    siblings.push(request);
    requestsByCollection.set(request.collectionId, siblings);
  }

  function build(parentId: string | null): CollectionTreeNode[] {
    return (childrenByParent.get(parentId) ?? []).map((collection) => ({
      collection,
      children: build(collection.id),
      requests: requestsByCollection.get(collection.id) ?? [],
    }));
  }

  return build(null);
}

/** Flattens the tree into `{ id, label }` options for a `<select>`, indenting nested folders so their depth is visible. */
export function flattenCollectionsForSelect(nodes: CollectionTreeNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.collection.id, label: `${"— ".repeat(depth)}${node.collection.name}` },
    ...flattenCollectionsForSelect(node.children, depth + 1),
  ]);
}

/**
 * Walks a folder's parentId chain up to its top-level (root) ancestor — the
 * folder a per-folder environment is bound to. Returns null when
 * collectionId is null (no folder — the app-wide environment applies) or
 * doesn't match a known collection.
 */
export function findTopLevelAncestorId(collections: Collection[], collectionId: string | null): string | null {
  if (collectionId === null) return null;
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  let current = byId.get(collectionId);
  if (!current) return null;
  while (current.parentId !== null) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}
