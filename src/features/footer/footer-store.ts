"use client";

import { create } from "zustand";
import type { FooterColumn, FooterCopyright, FooterDesign, FooterWorkspace } from "./types";
import { createDefaultFooterWorkspace, mergeFooterWorkspaceImport } from "./defaults";

const HISTORY_MAX = 40;

type FooterStoreState = {
  workspace: FooterWorkspace;
  savedFingerprint: string;
  historyPast: FooterWorkspace[];
  historyFuture: FooterWorkspace[];
};

export const useFooterStore = create<FooterStoreState>(() => ({
  workspace: createDefaultFooterWorkspace(),
  savedFingerprint: "",
  historyPast: [],
  historyFuture: [],
}));

function getWorkspace(): FooterWorkspace {
  return useFooterStore.getState().workspace;
}

export function useFooterWorkspace(): FooterWorkspace {
  return useFooterStore((s) => s.workspace);
}

export function useFooterIsDirty(): boolean {
  return useFooterStore((s) => {
    if (!s.savedFingerprint) return false;
    return JSON.stringify(s.workspace) !== s.savedFingerprint;
  });
}

export function useFooterCanUndo(): boolean {
  return useFooterStore((s) => s.historyPast.length > 0);
}

export function useFooterCanRedo(): boolean {
  return useFooterStore((s) => s.historyFuture.length > 0);
}

function pushHistorySnapshot(): void {
  const { workspace, historyPast } = useFooterStore.getState();
  const past = [...historyPast, structuredClone(workspace)];
  if (past.length > HISTORY_MAX) past.shift();
  useFooterStore.setState({ historyPast: past, historyFuture: [] });
}

function applyWorkspace(next: FooterWorkspace, recordHistory = true): void {
  if (recordHistory) pushHistorySnapshot();
  useFooterStore.setState({ workspace: next });
}

export function markFooterSaved(): void {
  useFooterStore.setState({
    savedFingerprint: JSON.stringify(getWorkspace()),
    historyPast: [],
    historyFuture: [],
  });
}

export function getSavedFooterBaseline(): Record<string, unknown> {
  const saved = useFooterStore.getState().savedFingerprint;
  if (saved) {
    try {
      return JSON.parse(saved) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  return getWorkspace() as unknown as Record<string, unknown>;
}

export function setFooterWorkspace(next: FooterWorkspace): void {
  applyWorkspace(next, false);
}

export function applyFooterImport(raw: unknown): void {
  useFooterStore.setState({
    workspace: mergeFooterWorkspaceImport(raw),
    historyPast: [],
    historyFuture: [],
  });
}

export function undoFooterWorkspace(): void {
  const { historyPast, workspace, historyFuture } = useFooterStore.getState();
  if (!historyPast.length) return;
  const previous = historyPast[historyPast.length - 1];
  useFooterStore.setState({
    historyPast: historyPast.slice(0, -1),
    historyFuture: [structuredClone(workspace), ...historyFuture],
    workspace: previous,
  });
}

export function redoFooterWorkspace(): void {
  const { historyPast, workspace, historyFuture } = useFooterStore.getState();
  if (!historyFuture.length) return;
  const next = historyFuture[0];
  useFooterStore.setState({
    historyFuture: historyFuture.slice(1),
    historyPast: [...historyPast, structuredClone(workspace)],
    workspace: next,
  });
}

export function patchFooter(patch: Partial<FooterWorkspace>): void {
  applyWorkspace({ ...getWorkspace(), ...patch });
}

export function setFooterDesign(design: Partial<FooterDesign>): void {
  const w = getWorkspace();
  patchFooter({ design: { ...w.design, ...design } });
}

export function setFooterCopyright(copyright: Partial<FooterCopyright>): void {
  const w = getWorkspace();
  patchFooter({ copyright: { ...w.copyright, ...copyright } });
}

export function setFooterResponsive(responsive: Partial<FooterWorkspace["responsive"]>): void {
  const w = getWorkspace();
  const next = { ...w.responsive, ...responsive };
  patchFooter({ responsive: next, gridColumns: next.desktop });
}

export function updateFooterColumn(id: string, patch: Partial<FooterColumn>): void {
  const w = getWorkspace();
  patchFooter({
    columns: w.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}

export function addFooterColumn(column: FooterColumn): void {
  const w = getWorkspace();
  patchFooter({ columns: [...w.columns, column] });
}

export function removeFooterColumn(id: string): void {
  const w = getWorkspace();
  patchFooter({ columns: w.columns.filter((c) => c.id !== id) });
}

export function reorderFooterColumn(fromIndex: number, toIndex: number): void {
  const w = getWorkspace();
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= w.columns.length) return;
  const cols = [...w.columns];
  const [item] = cols.splice(fromIndex, 1);
  cols.splice(toIndex, 0, item);
  patchFooter({ columns: cols });
}

export function duplicateFooterColumn(id: string): void {
  const w = getWorkspace();
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
  const w = getWorkspace();
  const idx = w.columns.findIndex((c) => c.id === id);
  if (idx < 0) return;
  reorderFooterColumn(idx, idx + direction);
}

export function serializeFooterWorkspace(): FooterWorkspace {
  return getWorkspace();
}

export function applyFooterTemplateWorkspace(workspace: FooterWorkspace): void {
  applyWorkspace(workspace);
}
