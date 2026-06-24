import type { SharedElementType } from "./names";

export const SHARED_ELEMENT_HANDOFF_KEY = "brt:shared-element-handoff";

export type SharedElementHandoff = {
  type: SharedElementType;
  id: string;
  ts: number;
};

export function readSharedElementHandoff(): SharedElementHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SHARED_ELEMENT_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SharedElementHandoff;
    if (!parsed?.type || !parsed?.id) return null;
    if (Date.now() - parsed.ts > 30_000) {
      sessionStorage.removeItem(SHARED_ELEMENT_HANDOFF_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSharedElementHandoff(handoff: Omit<SharedElementHandoff, "ts">): void {
  if (typeof window === "undefined") return;
  const payload: SharedElementHandoff = { ...handoff, ts: Date.now() };
  sessionStorage.setItem(SHARED_ELEMENT_HANDOFF_KEY, JSON.stringify(payload));
  document.documentElement.dataset.sharedElementHandoff = "true";
  document.documentElement.dataset.sharedElementType = handoff.type;
  document.documentElement.dataset.sharedElementId = handoff.id;
}

export function clearSharedElementHandoff(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SHARED_ELEMENT_HANDOFF_KEY);
  delete document.documentElement.dataset.sharedElementHandoff;
  delete document.documentElement.dataset.sharedElementType;
  delete document.documentElement.dataset.sharedElementId;
}
