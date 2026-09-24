import type { Collection, RequestExample, SavedRequest } from "../types";

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

/** Groups a flat examples list by the saved request each one belongs to. */
export function groupExamplesByRequest(examples: RequestExample[]): Map<string, RequestExample[]> {
  const byRequest = new Map<string, RequestExample[]>();
  for (const example of examples) {
    const siblings = byRequest.get(example.requestId) ?? [];
    siblings.push(example);
    byRequest.set(example.requestId, siblings);
  }
  return byRequest;
}

/**
 * Prunes the tree to what matches a sidebar filter (case-insensitive): a
 * folder whose own name matches keeps its whole subtree; otherwise it's kept
 * only for the requests (matched by name or URL) and subfolders beneath it
 * that match. An empty query returns the tree unchanged.
 */
export function filterCollectionsTree(nodes: CollectionTreeNode[], query: string): CollectionTreeNode[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return nodes;

  return nodes.flatMap((node) => {
    if (node.collection.name.toLowerCase().includes(needle)) return [node];
    const children = filterCollectionsTree(node.children, needle);
    const requests = node.requests.filter(
      (request) => request.name.toLowerCase().includes(needle) || request.url.toLowerCase().includes(needle),
    );
    return children.length > 0 || requests.length > 0 ? [{ ...node, children, requests }] : [];
  });
}

/** Every folder id in a subtree (the node itself included) — used to tell whether the open request lives inside a folder being deleted. */
export function collectSubtreeIds(node: CollectionTreeNode): string[] {
  return [node.collection.id, ...node.children.flatMap(collectSubtreeIds)];
}

/** Folder names from the top-level folder down to `collectionId` itself, for the request breadcrumb. */
export function folderPath(collections: Collection[], collectionId: string | null): string[] {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const names: string[] = [];
  let current = collectionId ? byId.get(collectionId) : undefined;
  // Bounded by the folder count so a (backend-prevented) parent cycle can't loop forever.
  while (current && names.length < collections.length) {
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names;
}
