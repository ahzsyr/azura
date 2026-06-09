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
    registerPageActions({
      onSave: hasHandler(current?.onSave) ? dispatchSave : undefined,
      saveLabel: current?.saveLabel,
      saveTooltip: current?.saveTooltip,
      canSave: current?.canSave ?? hasHandler(current?.onSave),
      onUpdate: hasHandler(current?.onUpdate) ? dispatchUpdate : undefined,
      updateLabel: current?.updateLabel,
      updateTooltip: current?.updateTooltip,
      canUpdate: current?.canUpdate ?? hasHandler(current?.onUpdate),
      onRebuildIndex: hasHandler(current?.onRebuildIndex) ? dispatchRebuild : undefined,
      rebuildIndexLabel: current?.rebuildIndexLabel,
      onPublish: hasHandler(current?.onPublish) ? dispatchPublish : undefined,
      publishLabel: current?.publishLabel,
      publishTooltip: current?.publishTooltip,
      onPreview: current?.onPreview,
      onUndo: current?.onUndo,
      onRedo: current?.onRedo,
      canUndo: current?.canUndo,
      canRedo: current?.canRedo,
      canPublish: current?.canPublish ?? hasHandler(current?.onPublish),
      canPreview: current?.canPreview ?? hasHandler(current?.onPreview),
      markSavedOnSaveSuccess: current?.markSavedOnSaveSuccess,
      selfManagedSaveStatus: current?.selfManagedSaveStatus,
      onCancel: hasHandler(current?.onCancel) ? dispatchCancel : undefined,
      cancelLabel: current?.cancelLabel,
      canCancel: current?.canCancel,
    });

    return () => clearPageActions();
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
    dispatchSave,
    dispatchCancel,
    dispatchUpdate,
    dispatchPublish,
    dispatchRebuild,
  ]);

  useEffect(() => {
    return () => {
      clearPageActions();
      resetSaveStatus();
    };
  }, [clearPageActions, resetSaveStatus]);

  return { markUnsaved, markSaved, setSaveStatus };
}
