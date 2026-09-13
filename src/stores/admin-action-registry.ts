/**
 * Ownership-stack registry for admin top-bar page actions.
 * Higher-priority owners supersede lower ones; unmount restores the next owner.
 */

import type { PageActions } from "@/stores/admin-ui-store";

export type PageActionOwner = {
  /** Unique instance id, e.g. "page-editor:r42" */
  id: string;
  /** Semantic key for debugging, e.g. "page-editor" */
  ownerKey: string;
  /** Logical scope, e.g. "page-editor" | "seo-tab" */
  scope: string;
  /** Higher priority becomes active when mounted */
  priority: number;
  entityId?: string;
};

export type ActionStackEntry = {
  owner: PageActionOwner;
  actions: PageActions;
};

export function sortStackByPriority(stack: ActionStackEntry[]): ActionStackEntry[] {
  return [...stack].sort((a, b) => {
    if (b.owner.priority !== a.owner.priority) {
      return b.owner.priority - a.owner.priority;
    }
    // Stable tie-break: later registration wins (keep relative order by pushing)
    return 0;
  });
}

export function deriveActiveFromStack(stack: ActionStackEntry[]): {
  pageActions: PageActions;
  activeOwner: PageActionOwner | null;
} {
  const sorted = sortStackByPriority(stack);
  if (sorted.length === 0) {
    return { pageActions: {}, activeOwner: null };
  }
  return {
    pageActions: sorted[0]!.actions,
    activeOwner: sorted[0]!.owner,
  };
}

/** Upsert an entry by owner.id; returns new stack (unsorted). */
export function upsertStackEntry(
  stack: ActionStackEntry[],
  entry: ActionStackEntry,
): ActionStackEntry[] {
  const idx = stack.findIndex((e) => e.owner.id === entry.owner.id);
  if (idx >= 0) {
    const next = [...stack];
    next[idx] = entry;
    return next;
  }
  return [...stack, entry];
}

/** Remove entry by owner.id; returns new stack. No-op if id not found. */
export function removeStackEntry(
  stack: ActionStackEntry[],
  ownerId: string,
): ActionStackEntry[] {
  return stack.filter((e) => e.owner.id !== ownerId);
}

export type RegisteredActionKey =
  | "save"
  | "update"
  | "publish"
  | "cancel"
  | "preview"
  | "rebuildIndex"
  | "undo"
  | "redo";

const HANDLER_MAP: Record<RegisteredActionKey, keyof PageActions> = {
  save: "onSave",
  update: "onUpdate",
  publish: "onPublish",
  cancel: "onCancel",
  preview: "onPreview",
  rebuildIndex: "onRebuildIndex",
  undo: "onUndo",
  redo: "onRedo",
};

const ENABLED_MAP: Partial<Record<RegisteredActionKey, keyof PageActions>> = {
  save: "canSave",
  update: "canUpdate",
  publish: "canPublish",
  cancel: "canCancel",
  preview: "canPreview",
  undo: "canUndo",
  redo: "canRedo",
};

export function getRegisteredActionKeys(actions: PageActions): RegisteredActionKey[] {
  const keys: RegisteredActionKey[] = [];
  for (const [key, handlerProp] of Object.entries(HANDLER_MAP) as [
    RegisteredActionKey,
    keyof PageActions,
  ][]) {
    if (typeof actions[handlerProp] === "function") {
      keys.push(key);
    }
  }
  return keys;
}

export function getEnabledActionKeys(actions: PageActions): RegisteredActionKey[] {
  return getRegisteredActionKeys(actions).filter((key) => {
    const canProp = ENABLED_MAP[key];
    if (!canProp) return true;
    const can = actions[canProp];
    return can !== false;
  });
}

/** Dev-only invariant checks when registering actions. */
export function validatePageActionsInDev(
  actions: PageActions,
  owner: PageActionOwner,
): void {
  if (process.env.NODE_ENV === "production") return;

  const warn = (msg: string) => {
    console.warn("[Admin Action System]", msg, {
      ownerKey: owner.ownerKey,
      ownerId: owner.id,
      scope: owner.scope,
    });
  };

  if (actions.canSave === true && typeof actions.onSave !== "function") {
    warn("canSave: true without onSave handler");
  }
  if (actions.canPublish === true && typeof actions.onPublish !== "function") {
    warn("canPublish: true without onPublish handler");
  }
  if (actions.canUpdate === true && typeof actions.onUpdate !== "function") {
    warn("canUpdate: true without onUpdate handler");
  }
  if (actions.canPreview === true && typeof actions.onPreview !== "function") {
    warn("canPreview: true without onPreview handler");
  }
  if (actions.canCancel === true && typeof actions.onCancel !== "function") {
    warn("canCancel: true without onCancel handler");
  }
  if (actions.canUndo === true && typeof actions.onUndo !== "function") {
    warn("canUndo: true without onUndo handler");
  }
  if (actions.canRedo === true && typeof actions.onRedo !== "function") {
    warn("canRedo: true without onRedo handler");
  }
}
