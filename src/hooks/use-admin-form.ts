"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useAdminUiStore, type PageActions } from "@/stores/admin-ui-store";
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
              if (pageActions.selfManagedSaveStatus) return;
              if (ok === false) {
                setSaveStatus("unsaved");
                return;
              }
              if (pageActions.markSavedOnSaveSuccess !== false) {
                markSaved();
              } else {
                setSaveStatus("saved");
              }
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
  }, [pageActions, saveStatus, setSaveStatus, markSaved]);
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

export function useAdminFormState(options?: PageActions) {
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const current = optionsRef.current;
    registerPageActions({
      onSave: current?.onSave,
      saveLabel: current?.saveLabel,
      saveTooltip: current?.saveTooltip,
      canSave: current?.canSave ?? Boolean(current?.onSave),
      onUpdate: current?.onUpdate,
      updateLabel: current?.updateLabel,
      updateTooltip: current?.updateTooltip,
      canUpdate: current?.canUpdate ?? Boolean(current?.onUpdate),
      onRebuildIndex: current?.onRebuildIndex,
      rebuildIndexLabel: current?.rebuildIndexLabel,
      onPublish: current?.onPublish,
      publishLabel: current?.publishLabel,
      publishTooltip: current?.publishTooltip,
      onPreview: current?.onPreview,
      onUndo: current?.onUndo,
      onRedo: current?.onRedo,
      canUndo: current?.canUndo,
      canRedo: current?.canRedo,
      canPublish: current?.canPublish ?? Boolean(current?.onPublish),
      canPreview: current?.canPreview ?? Boolean(current?.onPreview),
      markSavedOnSaveSuccess: current?.markSavedOnSaveSuccess,
      selfManagedSaveStatus: current?.selfManagedSaveStatus,
      onCancel: current?.onCancel,
      cancelLabel: current?.cancelLabel,
      canCancel: current?.canCancel,
    });

    return () => clearPageActions();
  }, [
    options?.onSave,
    options?.saveLabel,
    options?.saveTooltip,
    options?.canSave,
    options?.onUpdate,
    options?.updateLabel,
    options?.updateTooltip,
    options?.canUpdate,
    options?.onRebuildIndex,
    options?.rebuildIndexLabel,
    options?.onPublish,
    options?.publishLabel,
    options?.publishTooltip,
    options?.onPreview,
    options?.onUndo,
    options?.onRedo,
    options?.canUndo,
    options?.canRedo,
    options?.canPublish,
    options?.canPreview,
    options?.markSavedOnSaveSuccess,
    options?.selfManagedSaveStatus,
    options?.onCancel,
    options?.cancelLabel,
    options?.canCancel,
    registerPageActions,
    clearPageActions,
  ]);

  return { markUnsaved, markSaved, setSaveStatus };
}
