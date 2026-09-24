import { createCollection, saveRequestToCollection } from "../api/collections";
import type { ImportNode } from "./parsePostmanCollection";

/**
 * Recreates a parsed Postman collection's folder/request tree under
 * `parentId`, one call at a time. Sequential (not Promise.all) on purpose:
 * a subfolder can't be created until its parent folder's id comes back, and
 * a predictable one-at-a-time order is easier to reason about if an import
 * fails partway through a large collection.
 */
export async function importNodes(nodes: ImportNode[], parentId: string): Promise<void> {
  for (const node of nodes) {
    if (node.type === "folder") {
      const created = await createCollection({ name: node.name, parentId });
      await importNodes(node.children, created.id);
    } else {
      await saveRequestToCollection(parentId, {
        name: node.name,
        method: node.method,
        url: node.url,
        headers: node.headers,
        authType: node.authType,
        authConfig: node.authConfig,
        bodyType: node.bodyType,
        body: node.body,
      });
    }
  }
}

/** Counts every request in the tree, recursively — used to show "12 requests across 3 folders" before the user commits to importing. */
export function countRequests(nodes: ImportNode[]): number {
  return nodes.reduce((total, node) => total + (node.type === "request" ? 1 : countRequests(node.children)), 0);
}

export function countFolders(nodes: ImportNode[]): number {
  return nodes.reduce((total, node) => total + (node.type === "folder" ? 1 + countFolders(node.children) : 0), 0);
}
