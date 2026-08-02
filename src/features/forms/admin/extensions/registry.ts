import type { ReactNode } from "react";

export type DesignerTabId =
  | "overview"
  | "builder"
  | "logic"
  | "automation"
  | "analytics"
  | "publish";

export type DesignerExtension = {
  id: string;
  tab: DesignerTabId;
  label: string;
  order?: number;
  render: () => ReactNode;
};

const registry = new Map<string, DesignerExtension>();

export function registerDesignerExtension(ext: DesignerExtension): void {
  registry.set(ext.id, ext);
}

export function unregisterDesignerExtension(id: string): void {
  registry.delete(id);
}

export function listDesignerExtensions(tab?: DesignerTabId): DesignerExtension[] {
  const all = [...registry.values()];
  const filtered = tab ? all.filter((e) => e.tab === tab) : all;
  return filtered.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function clearDesignerExtensionsForTests(): void {
  registry.clear();
}
