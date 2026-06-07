"use client";

import { useEffect, useRef } from "react";
import { useAdminUiStore, type PageActions } from "@/stores/admin-ui-store";

export function useAdminKeyboardShortcuts() {
  const pageActions = useAdminUiStore((s) => s.pageActions);
  const saveStatus = useAdminUiStore((s) => s.saveStatus);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        if (pageActions.onSave && saveStatus !== "saving") {
          void pageActions.onSave();
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
        window.dispatchEvent(new CustomEvent("admin:cancel"));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pageActions, saveStatus]);
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
    const wrapSave = optionsRef.current?.onSave
      ? async () => {
          setSaveStatus("saving");
          try {
            await optionsRef.current?.onSave?.();
            markSaved();
          } catch {
            setSaveStatus("error");
          }
        }
      : undefined;

    registerPageActions({
      onSave: wrapSave,
      onPublish: () => optionsRef.current?.onPublish?.(),
      onPreview: optionsRef.current?.onPreview,
      onUndo: optionsRef.current?.onUndo,
      onRedo: optionsRef.current?.onRedo,
      canUndo: optionsRef.current?.canUndo,
      canRedo: optionsRef.current?.canRedo,
      canPublish: optionsRef.current?.canPublish ?? Boolean(optionsRef.current?.onPublish),
      canPreview: optionsRef.current?.canPreview ?? Boolean(optionsRef.current?.onPreview),
    });

    return () => clearPageActions();
  }, [
    options?.onSave,
    options?.onPublish,
    options?.onPreview,
    options?.onUndo,
    options?.onRedo,
    options?.canUndo,
    options?.canRedo,
    options?.canPublish,
    options?.canPreview,
    registerPageActions,
    clearPageActions,
    markSaved,
    setSaveStatus,
  ]);

  return { markUnsaved, markSaved, setSaveStatus };
}
