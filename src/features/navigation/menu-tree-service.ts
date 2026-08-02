import type { MenuItem } from "./types";

export type FlatMenuNode = {
  id: string;
  parentId: string | null;
  depth: number;
  item: MenuItem;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function flattenMenuTree(items: MenuItem[], parentId: string | null = null, depth = 0): FlatMenuNode[] {
  const out: FlatMenuNode[] = [];
  for (const item of items) {
    out.push({ id: item.id, parentId, depth, item });
    if (item.children?.length) {
      out.push(...flattenMenuTree(item.children, item.id, depth + 1));
    }
  }
  return out;
}

export function collectDescendantIds(item: MenuItem): string[] {
  const out: string[] = [];
  const walk = (node: MenuItem) => {
    out.push(node.id);
    for (const child of node.children ?? []) walk(child);
  };
  walk(item);
  return out;
}

export function countMaxDepth(items: MenuItem[]): number {
  let max = 0;
  const walk = (nodes: MenuItem[], depth: number) => {
    max = Math.max(max, depth);
    for (const node of nodes) walk(node.children ?? [], depth + 1);
  };
  walk(items, 1);
  return max;
}

function removeFromTree(
  items: MenuItem[],
  itemId: string,
): { next: MenuItem[]; removed: MenuItem | null; parentId: string | null } {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.id === itemId) {
      const next = [...items.slice(0, i), ...items.slice(i + 1)];
      return { next, removed: item, parentId: null };
    }
    if (item.children?.length) {
      const childResult = removeFromTree(item.children, itemId);
      if (childResult.removed) {
        const replaced = {
          ...item,
          children: childResult.next,
        };
        const next = [...items];
        next[i] = replaced;
        return { next, removed: childResult.removed, parentId: item.id };
      }
    }
  }
  return { next: items, removed: null, parentId: null };
}

function findSiblings(items: MenuItem[], itemId: string): { siblings: MenuItem[]; parentId: string | null } | null {
  for (const item of items) {
    if (item.children?.some((c) => c.id === itemId)) {
      return { siblings: item.children, parentId: item.id };
    }
    if (item.children?.length) {
      const nested = findSiblings(item.children, itemId);
      if (nested) return nested;
    }
  }
  if (items.some((i) => i.id === itemId)) return { siblings: items, parentId: null };
  return null;
}

export function reorderByReference(items: MenuItem[], activeId: string, overId: string): MenuItem[] {
  if (activeId === overId) return items;
  const cloned = deepClone(items);
  const removed = removeFromTree(cloned, activeId);
  if (!removed.removed) return items;

  const siblingsInfo = findSiblings(removed.next, overId);
  if (!siblingsInfo) return items;
  const insertIndex = siblingsInfo.siblings.findIndex((s) => s.id === overId);
  if (insertIndex < 0) return items;

  const nextSiblings = [...siblingsInfo.siblings];
  nextSiblings.splice(insertIndex, 0, removed.removed);

  if (!siblingsInfo.parentId) return nextSiblings;

  const patch = (nodes: MenuItem[]): MenuItem[] =>
    nodes.map((node) =>
      node.id === siblingsInfo.parentId
        ? { ...node, children: nextSiblings }
        : { ...node, children: patch(node.children ?? []) },
    );

  return patch(removed.next);
}

export function moveIntoParent(items: MenuItem[], activeId: string, parentId: string): MenuItem[] {
  if (activeId === parentId) return items;
  const cloned = deepClone(items);
  const removed = removeFromTree(cloned, activeId);
  if (!removed.removed) return items;

  const patch = (nodes: MenuItem[]): MenuItem[] =>
    nodes.map((node) => {
      if (node.id === parentId) {
        return { ...node, children: [...(node.children ?? []), removed.removed as MenuItem] };
      }
      if (!node.children?.length) return node;
      return { ...node, children: patch(node.children) };
    });

  return patch(removed.next);
}

export function updateItemsBulk(
  items: MenuItem[],
  ids: Set<string>,
  updater: (item: MenuItem) => MenuItem,
): MenuItem[] {
  return items.map((item) => {
    const next = ids.has(item.id) ? updater(item) : item;
    return {
      ...next,
      children: updateItemsBulk(next.children ?? [], ids, updater),
    };
  });
}

export function removeItemsBulk(items: MenuItem[], ids: Set<string>): MenuItem[] {
  return items
    .filter((item) => !ids.has(item.id))
    .map((item) => ({
      ...item,
      children: removeItemsBulk(item.children ?? [], ids),
    }));
}

export function duplicateItemsBulk(items: MenuItem[], ids: Set<string>): MenuItem[] {
  const cloneWithNewIds = (item: MenuItem): MenuItem => ({
    ...deepClone(item),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    children: (item.children ?? []).map(cloneWithNewIds),
  });

  const mapChildren = (nodes: MenuItem[]): MenuItem[] => {
    const out: MenuItem[] = [];
    for (const item of nodes) {
      const withChildren = { ...item, children: mapChildren(item.children ?? []) };
      out.push(withChildren);
      if (ids.has(item.id)) out.push(cloneWithNewIds(withChildren));
    }
    return out;
  };

  return mapChildren(items);
}

export function searchMatch(item: MenuItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const url = item.url ?? item.linkUrl ?? "";
  return (
    item.label.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q) ||
    item.type.toLowerCase().includes(q) ||
    url.toLowerCase().includes(q)
  );
}

export function filterTree(items: MenuItem[], predicate: (item: MenuItem) => boolean): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    const filteredChildren = filterTree(item.children ?? [], predicate);
    if (predicate(item) || filteredChildren.length > 0) {
      out.push({ ...item, children: filteredChildren });
    }
  }
  return out;
}

export const MenuTreeService = {
  flattenMenuTree,
  collectDescendantIds,
  countMaxDepth,
  reorderByReference,
  moveIntoParent,
  updateItemsBulk,
  removeItemsBulk,
  duplicateItemsBulk,
  searchMatch,
  filterTree,
};
