import type { MenuItem } from "./types";

function pruneSelection(items: MenuItem[], selected: Set<string>): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    if (selected.has(item.id)) {
      out.push(item);
      continue;
    }
    const children = pruneSelection(item.children ?? [], selected);
    if (children.length > 0) out.push({ ...item, children });
  }
  return out;
}

export function exportSelectedItemsBlob(items: MenuItem[], selected: Set<string>): Blob | null {
  if (selected.size === 0) return null;
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: pruneSelection(items, selected),
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export function importItemsFromJson(raw: unknown): MenuItem[] | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { items?: unknown };
  if (!Array.isArray(value.items)) return null;
  return value.items as MenuItem[];
}

export const MenuImportExportService = {
  exportSelectedItemsBlob,
  importItemsFromJson,
};
