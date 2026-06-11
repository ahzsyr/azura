import { atom, computed } from "nanostores";
import type { FooterColumn, FooterCopyright, FooterDesign, FooterWorkspace } from "./types";
import { createDefaultFooterWorkspace, mergeFooterWorkspaceImport } from "./defaults";

export const $footerWorkspace = atom<FooterWorkspace>(createDefaultFooterWorkspace());
export const $footerSavedFingerprint = atom("");

export const $footerIsDirty = computed(
  [$footerWorkspace, $footerSavedFingerprint],
  (ws, saved) => {
    if (!saved) return false;
    return JSON.stringify(ws) !== saved;
  },
);

export function markFooterSaved(): void {
  $footerSavedFingerprint.set(JSON.stringify($footerWorkspace.get()));
}

export function setFooterWorkspace(next: FooterWorkspace): void {
  $footerWorkspace.set(next);
}

export function applyFooterImport(raw: unknown): void {
  $footerWorkspace.set(mergeFooterWorkspaceImport(raw));
}

export function patchFooter(patch: Partial<FooterWorkspace>): void {
  $footerWorkspace.set({ ...$footerWorkspace.get(), ...patch });
}

export function setFooterDesign(design: Partial<FooterDesign>): void {
  const w = $footerWorkspace.get();
  patchFooter({ design: { ...w.design, ...design } });
}

export function setFooterCopyright(copyright: Partial<FooterCopyright>): void {
  const w = $footerWorkspace.get();
  patchFooter({ copyright: { ...w.copyright, ...copyright } });
}

export function updateFooterColumn(id: string, patch: Partial<FooterColumn>): void {
  const w = $footerWorkspace.get();
  patchFooter({
    columns: w.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}

export function addFooterColumn(column: FooterColumn): void {
  const w = $footerWorkspace.get();
  patchFooter({ columns: [...w.columns, column] });
}

export function removeFooterColumn(id: string): void {
  const w = $footerWorkspace.get();
  patchFooter({ columns: w.columns.filter((c) => c.id !== id) });
}

export function moveFooterColumn(id: string, direction: -1 | 1): void {
  const w = $footerWorkspace.get();
  const idx = w.columns.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const next = idx + direction;
  if (next < 0 || next >= w.columns.length) return;
  const cols = [...w.columns];
  const [item] = cols.splice(idx, 1);
  cols.splice(next, 0, item);
  patchFooter({ columns: cols });
}

export function serializeFooterWorkspace(): FooterWorkspace {
  return $footerWorkspace.get();
}
