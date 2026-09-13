"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import {
  useAdminUiStore,
  type PageActions,
  type PageActionOwner,
} from "@/stores/admin-ui-store";

export type UseAdminPageActionsOptions = PageActions & {
  /** Semantic key for debugging (e.g. "page-editor"). Required when registering. */
  ownerKey: string;
  /** Logical scope (e.g. "page-editor", "seo-tab"). Defaults to ownerKey. */
  scope?: string;
  /** Higher priority supersedes lower when both mounted. Default 0. */
  priority?: number;
  entityId?: string;
  /**
   * When false, do not register (e.g. inactive tab / list view).
   * Defaults to true when any actionable handler is present.
   */
  enabled?: boolean;
};

function hasHandler(fn: unknown): boolean {
  return typeof fn === "function";
}

function hasActionableHandlers(options?: PageActions): boolean {
  if (!options) return false;
  return (
    hasHandler(options.onSave) ||
    hasHandler(options.onUpdate) ||
    hasHandler(options.onPublish) ||
    hasHandler(options.onCancel) ||
    hasHandler(options.onRebuildIndex) ||
    hasHandler(options.onPreview) ||
    hasHandler(options.onUndo) ||
    hasHandler(options.onRedo)
  );
}

function resolveSelfManaged(options?: PageActions): boolean | undefined {
  if (!options) return undefined;
  if (options.saveStatusMode === "self-managed") return true;
  if (options.saveStatusMode === "automatic") return false;
  return options.selfManagedSaveStatus;
}

/**
 * Canonical API for registering admin top-bar actions.
 * Uses an ownership stack so nested panels (e.g. SEO tab) can supersede
 * and restore the parent editor without clearing the wrong owner.
 */
export function useAdminPageActions(options?: UseAdminPageActionsOptions) {
  const registerAdminPageActions = useAdminUiStore((s) => s.registerAdminPageActions);
  const unregisterAdminPageActions = useAdminUiStore((s) => s.unregisterAdminPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const reactId = useId();
  const ownerIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  if (options?.ownerKey && !ownerIdRef.current) {
    ownerIdRef.current = `${options.ownerKey}:${reactId.replace(/:/g, "")}`;
  }

  const dispatchSave = useCallback(async () => {
    const fn = optionsRef.current?.onSave;
    if (!fn) return false;
    return fn();
  }, []);

  const dispatchCancel = useCallback(async () => {
    await optionsRef.current?.onCancel?.();
  }, []);

  const dispatchUpdate = useCallback(async () => {
    await optionsRef.current?.onUpdate?.();
  }, []);

  const dispatchPublish = useCallback(async () => {
    const fn = optionsRef.current?.onPublish;
    if (!fn) return false;
    return fn();
  }, []);

  const dispatchRebuild = useCallback(async () => {
    await optionsRef.current?.onRebuildIndex?.();
  }, []);

  const dispatchPreview = useCallback(() => {
    optionsRef.current?.onPreview?.();
  }, []);

  const dispatchUndo = useCallback(() => {
    optionsRef.current?.onUndo?.();
  }, []);

  const dispatchRedo = useCallback(() => {
    optionsRef.current?.onRedo?.();
  }, []);

  useEffect(() => {
    const current = optionsRef.current;
    const ownerKey = current?.ownerKey;
    const enabled =
      current?.enabled ?? (ownerKey ? hasActionableHandlers(current) : false);

    if (!ownerKey || !enabled || !hasActionableHandlers(current)) {
      const id = ownerIdRef.current;
      if (id) {
        unregisterAdminPageActions(id);
      }
      return;
    }

    if (!ownerIdRef.current) {
      ownerIdRef.current = `${ownerKey}:${reactId.replace(/:/g, "")}`;
    }
    const ownerId = ownerIdRef.current;

    const buildActions = (): PageActions => {
      const latest = optionsRef.current;
      const selfManaged = resolveSelfManaged(latest);
      return {
        onSave: hasHandler(latest?.onSave) ? dispatchSave : undefined,
        saveLabel: latest?.saveLabel,
        saveTooltip: latest?.saveTooltip,
        canSave: latest?.canSave ?? hasHandler(latest?.onSave),
        onUpdate: hasHandler(latest?.onUpdate) ? dispatchUpdate : undefined,
        updateLabel: latest?.updateLabel,
        updateTooltip: latest?.updateTooltip,
        canUpdate: latest?.canUpdate ?? hasHandler(latest?.onUpdate),
        onRebuildIndex: hasHandler(latest?.onRebuildIndex) ? dispatchRebuild : undefined,
        rebuildIndexLabel: latest?.rebuildIndexLabel,
        onPublish: hasHandler(latest?.onPublish) ? dispatchPublish : undefined,
        publishLabel: latest?.publishLabel,
        publishTooltip: latest?.publishTooltip,
        onPreview: hasHandler(latest?.onPreview) ? dispatchPreview : undefined,
        onUndo: hasHandler(latest?.onUndo) ? dispatchUndo : undefined,
        onRedo: hasHandler(latest?.onRedo) ? dispatchRedo : undefined,
        canUndo: latest?.canUndo,
        canRedo: latest?.canRedo,
        canPublish: latest?.canPublish ?? hasHandler(latest?.onPublish),
        canPreview: latest?.canPreview ?? hasHandler(latest?.onPreview),
        markSavedOnSaveSuccess: latest?.markSavedOnSaveSuccess,
        selfManagedSaveStatus: selfManaged,
        saveStatusMode: latest?.saveStatusMode ?? (selfManaged ? "self-managed" : "automatic"),
        onCancel: hasHandler(latest?.onCancel) ? dispatchCancel : undefined,
        cancelLabel: latest?.cancelLabel,
        canCancel: latest?.canCancel,
      };
    };

    const owner: PageActionOwner = {
      id: ownerId,
      ownerKey,
      scope: current.scope ?? ownerKey,
      priority: current.priority ?? 0,
      entityId: current.entityId,
    };

    const applyActions = () => {
      const latest = optionsRef.current;
      if (!latest?.ownerKey || !hasActionableHandlers(latest)) return;
      registerAdminPageActions(buildActions(), {
        ...owner,
        ownerKey: latest.ownerKey,
        scope: latest.scope ?? latest.ownerKey,
        priority: latest.priority ?? 0,
        entityId: latest.entityId,
      });
    };

    applyActions();
    const unsubHydrate = useAdminUiStore.persist.onFinishHydration(() => {
      applyActions();
    });
    if (useAdminUiStore.persist.hasHydrated()) {
      applyActions();
    }

    return () => {
      unsubHydrate();
      unregisterAdminPageActions(ownerId);
    };
  }, [
    options?.ownerKey,
    options?.scope,
    options?.priority,
    options?.entityId,
    options?.enabled,
    Boolean(options?.onSave),
    options?.saveLabel,
    options?.saveTooltip,
    options?.canSave,
    Boolean(options?.onUpdate),
    options?.updateLabel,
    options?.updateTooltip,
    options?.canUpdate,
    Boolean(options?.onRebuildIndex),
    options?.rebuildIndexLabel,
    Boolean(options?.onPublish),
    options?.publishLabel,
    options?.publishTooltip,
    Boolean(options?.onPreview),
    Boolean(options?.onUndo),
    Boolean(options?.onRedo),
    options?.canUndo,
    options?.canRedo,
    options?.canPublish,
    options?.canPreview,
    options?.markSavedOnSaveSuccess,
    options?.selfManagedSaveStatus,
    options?.saveStatusMode,
    Boolean(options?.onCancel),
    options?.cancelLabel,
    options?.canCancel,
    registerAdminPageActions,
    unregisterAdminPageActions,
    dispatchSave,
    dispatchCancel,
    dispatchUpdate,
    dispatchPublish,
    dispatchRebuild,
    dispatchPreview,
    dispatchUndo,
    dispatchRedo,
    reactId,
  ]);

  return {
    markUnsaved,
    markSaved,
    setSaveStatus,
    ownerId: ownerIdRef.current,
  };
}
