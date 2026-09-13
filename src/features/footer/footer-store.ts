import { atom, computed } from "nanostores";
import type { FooterColumn, FooterCopyright, FooterDesign, FooterWorkspace } from "./types";
import { createDefaultFooterWorkspace, mergeFooterWorkspaceImport } from "./defaults";

const HISTORY_MAX = 40;

export const $footerWorkspace = atom<FooterWorkspace>(createDefaultFooterWorkspace());
export const $footerSavedFingerprint = atom("");
export const $footerHistoryPast = atom<FooterWorkspace[]>([]);
export const $footerHistoryFuture = atom<FooterWorkspace[]>([]);

export const $footerIsDirty = computed(
  [$footerWorkspace, $footerSavedFingerprint],
  (ws, saved) => {
    if (!saved) return false;
    return JSON.stringify(ws) !== saved;
  },
);

export const $footerCanUndo = computed($footerHistoryPast, (past) => past.length > 0);
export const $footerCanRedo = computed($footerHistoryFuture, (future) => future.length > 0);

function pushHistorySnapshot(): void {
  const current = $footerWorkspace.get();
  const past = [...$footerHistoryPast.get(), structuredClone(current)];
  if (past.length > HISTORY_MAX) past.shift();
  $footerHistoryPast.set(past);
  $footerHistoryFuture.set([]);
}

function applyWorkspace(next: FooterWorkspace, recordHistory = true): void {
  if (recordHistory) pushHistorySnapshot();
  $footerWorkspace.set(next);
}

export function markFooterSaved(): void {
  $footerSavedFingerprint.set(JSON.stringify($footerWorkspace.get()));
  $footerHistoryPast.set([]);
  $footerHistoryFuture.set([]);
}

export function getSavedFooterBaseline(): Record<string, unknown> {
  const saved = $footerSavedFingerprint.get();
  if (saved) {
    try {
      return JSON.parse(saved) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  return $footerWorkspace.get() as unknown as Record<string, unknown>;
}

export function setFooterWorkspace(next: FooterWorkspace): void {
  applyWorkspace(next, false);
}

export function applyFooterImport(raw: unknown): void {
  $footerWorkspace.set(mergeFooterWorkspaceImport(raw));
  $footerHistoryPast.set([]);
  $footerHistoryFuture.set([]);
}

export function undoFooterWorkspace(): void {
  const past = $footerHistoryPast.get();
  if (!past.length) return;
  const previous = past[past.length - 1];
  $footerHistoryPast.set(past.slice(0, -1));
  $footerHistoryFuture.set([structuredClone($footerWorkspace.get()), ...$footerHistoryFuture.get()]);
  $footerWorkspace.set(previous);
}

export function redoFooterWorkspace(): void {
  const future = $footerHistoryFuture.get();
  if (!future.length) return;
  const next = future[0];
  $footerHistoryFuture.set(future.slice(1));
  $footerHistoryPast.set([...$footerHistoryPast.get(), structuredClone($footerWorkspace.get())]);
  $footerWorkspace.set(next);
}

export function patchFooter(patch: Partial<FooterWorkspace>): void {
  applyWorkspace({ ...$footerWorkspace.get(), ...patch });
}

export function setFooterDesign(design: Partial<FooterDesign>): void {
  const w = $footerWorkspace.get();
  patchFooter({ design: { ...w.design, ...design } });
}

export function setFooterCopyright(copyright: Partial<FooterCopyright>): void {
  const w = $footerWorkspace.get();
  patchFooter({ copyright: { ...w.copyright, ...copyright } });
}

export function setFooterResponsive(responsive: Partial<FooterWorkspace["responsive"]>): void {
  const w = $footerWorkspace.get();
  const next = { ...w.responsive, ...responsive };
  patchFooter({ responsive: next, gridColumns: next.desktop });
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

export function reorderFooterColumn(fromIndex: number, toIndex: number): void {
  const w = $footerWorkspace.get();
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= w.columns.length) return;
  const cols = [...w.columns];
  const [item] = cols.splice(fromIndex, 1);
  cols.splice(toIndex, 0, item);
  patchFooter({ columns: cols });
}

export function duplicateFooterColumn(id: string): void {
  const w = $footerWorkspace.get();
  const col = w.columns.find((c) => c.id === id);
  if (!col) return;
  const copy: FooterColumn = {
    ...structuredClone(col),
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: col.title ? `${col.title} (copy)` : col.title,
  };
  const idx = w.columns.findIndex((c) => c.id === id);
  const cols = [...w.columns];
  cols.splice(idx + 1, 0, copy);
  patchFooter({ columns: cols });
}

export function moveFooterColumn(id: string, direction: -1 | 1): void {
  const w = $footerWorkspace.get();
  const idx = w.columns.findIndex((c) => c.id === id);
  if (idx < 0) return;
  reorderFooterColumn(idx, idx + direction);
}

export function serializeFooterWorkspace(): FooterWorkspace {
  return $footerWorkspace.get();
}

export function applyFooterTemplateWorkspace(workspace: FooterWorkspace): void {
  applyWorkspace(workspace);
}
