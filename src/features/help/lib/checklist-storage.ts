import { HELP_CONTENT_VERSION } from "@/features/help/data/version";
import type {
  HelpChecklist,
  HelpChecklistProgress,
  HelpChecklistProgressStored,
} from "@/features/help/types";

const STORAGE_PREFIX = "admin-help-checklist:";

function storageKey(checklistId: string): string {
  return `${STORAGE_PREFIX}${checklistId}`;
}

export function readChecklistProgress(checklistId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(checklistId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HelpChecklistProgressStored;
    if (parsed.version !== HELP_CONTENT_VERSION) return [];
    return Array.isArray(parsed.checkedIds) ? parsed.checkedIds : [];
  } catch {
    return [];
  }
}

export function writeChecklistProgress(checklistId: string, checkedIds: string[]): void {
  if (typeof window === "undefined") return;
  const payload: HelpChecklistProgressStored = {
    version: HELP_CONTENT_VERSION,
    checkedIds,
  };
  window.localStorage.setItem(storageKey(checklistId), JSON.stringify(payload));
}

export function deriveChecklistProgress(
  checklist: HelpChecklist,
  checkedIds: string[]
): HelpChecklistProgress {
  const total = checklist.items.length;
  const checkedSet = new Set(checkedIds);
  const completed = checklist.items.filter((item) => checkedSet.has(item.id)).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent, checkedIds };
}
