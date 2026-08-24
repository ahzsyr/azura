"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  applySaveResult,
  useAdminUiStore,
  type PageActions,
} from "@/stores/admin-ui-store";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";

function resolveFormElement(
  target: string | RefObject<HTMLFormElement | null> | null | undefined
): HTMLFormElement | null {
  if (!target) return null;
  if (typeof target === "string") {
    return document.getElementById(target) as HTMLFormElement | null;
  }
  return target.current;
}

export function useAdminFormDirtySync(
  target: string | RefObject<HTMLFormElement | null> | null | undefined,
  enabled = true
) {
  const adminForm = useAdminFormOptional();
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);

  useEffect(() => {
    if (!enabled) return;
    const form = resolveFormElement(target);
    if (!form) return;

    const markDirty = () => {
      if (adminForm) adminForm.setDirty(true);
      else markUnsaved();
    };

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, [target, enabled, adminForm, markUnsaved]);
}

export function useAdminKeyboardShortcuts() {
  const pageActions = useAdminUiStore((s) => s.pageActions);
  const saveStatus = useAdminUiStore((s) => s.saveStatus);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const consumePendingDirty = useAdminUiStore((s) => s.consumePendingDirty);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        if (pageActions.onSave && saveStatus !== "saving") {
          if (!pageActions.selfManagedSaveStatus) {
            setSaveStatus("saving");
          }
          void (async () => {
            try {
              const ok = await pageActions.onSave?.();
              applySaveResult(ok, pageActions, {
                setSaveStatus,
                markSaved,
                consumePendingDirty,
              });
            } catch {
              if (!pageActions.selfManagedSaveStatus) {
                setSaveStatus("error");
              }
            }
          })();
        }
      }

      if (mod && e.key === "z" && !e.shiftKey && pageActions.onUndo && pageActions.canUndo) {
        e.preventDefault();
        pageActions.onUndo();
      }

      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey)) && pageActions.onRedo && pageActions.canRedo) {
        e.preventDefault();
        pageActions.onRedo();
      }

      if (e.key === "Escape") {
        const canCancel =
          pageActions.canCancel ?? (saveStatus === "unsaved" || saveStatus === "error");
        if (pageActions.onCancel && canCancel && saveStatus !== "saving") {
          e.preventDefault();
          void (async () => {
            try {
              await pageActions.onCancel?.();
              markSaved();
            } catch {
              /* keep unsaved */
            }
          })();
          return;
        }
        window.dispatchEvent(new CustomEvent("admin:cancel"));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pageActions, saveStatus, setSaveStatus, markSaved, consumePendingDirty]);
}

export function useUnsavedChangesGuard(enabled = true) {
  const saveStatus = useAdminUiStore((s) => s.saveStatus);
  const isDirty = saveStatus === "unsaved" || saveStatus === "error";

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled, isDirty]);

  return { isDirty };
}

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

export function useAdminFormState(options?: PageActions) {
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const resetSaveStatus = useAdminUiStore((s) => s.resetSaveStatus);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

  useEffect(() => {
    const current = optionsRef.current;
    if (!hasActionableHandlers(current)) {
      // Inactive: do not register empty actions or clear a sibling hook's registration.
      return;
    }

    const applyActions = () => {
      const latest = optionsRef.current;
      if (!hasActionableHandlers(latest)) return;
      registerPageActions({
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
        onPreview: latest?.onPreview,
        onUndo: latest?.onUndo,
        onRedo: latest?.onRedo,
        canUndo: latest?.canUndo,
        canRedo: latest?.canRedo,
        canPublish: latest?.canPublish ?? hasHandler(latest?.onPublish),
        canPreview: latest?.canPreview ?? hasHandler(latest?.onPreview),
        markSavedOnSaveSuccess: latest?.markSavedOnSaveSuccess,
        selfManagedSaveStatus: latest?.selfManagedSaveStatus,
        onCancel: hasHandler(latest?.onCancel) ? dispatchCancel : undefined,
        cancelLabel: latest?.cancelLabel,
        canCancel: latest?.canCancel,
      });
    };

    applyActions();
    // Sidebar rehydrates admin-ui persist async; re-apply so we win any stale merge.
    const unsubHydrate = useAdminUiStore.persist.onFinishHydration(() => {
      applyActions();
    });
    if (useAdminUiStore.persist.hasHydrated()) {
      applyActions();
    }

    return () => {
      unsubHydrate();
      // Only clear if we still own the slot (AnimatePresence / Strict Mode can
      // unmount an older registrar after a newer one has already registered).
      const owned = useAdminUiStore.getState().pageActions;
      if (
        owned.onSave === dispatchSave ||
        owned.onCancel === dispatchCancel ||
        owned.onPublish === dispatchPublish ||
        owned.onUpdate === dispatchUpdate ||
        owned.onRebuildIndex === dispatchRebuild
      ) {
        clearPageActions();
        resetSaveStatus();
      }
    };
  }, [
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
    Boolean(options?.onCancel),
    options?.cancelLabel,
    options?.canCancel,
    registerPageActions,
    clearPageActions,
    resetSaveStatus,
    dispatchSave,
    dispatchCancel,
    dispatchUpdate,
    dispatchPublish,
    dispatchRebuild,
  ]);

  return { markUnsaved, markSaved, setSaveStatus };
}
