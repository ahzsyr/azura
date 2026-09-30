"use client";

import { useEffect, useId, type RefObject } from "react";
import {
  applySaveResult,
  isSelfManagedSaveStatus,
  useAdminUiStore,
  type PageActions,
} from "@/stores/admin-ui-store";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
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
          if (!isSelfManagedSaveStatus(pageActions)) {
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
              if (!isSelfManagedSaveStatus(pageActions)) {
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

function hasActionableHandlers(options?: PageActions): boolean {
  if (!options) return false;
  return (
    typeof options.onSave === "function" ||
    typeof options.onUpdate === "function" ||
    typeof options.onPublish === "function" ||
    typeof options.onCancel === "function" ||
    typeof options.onRebuildIndex === "function" ||
    typeof options.onPreview === "function" ||
    typeof options.onUndo === "function" ||
    typeof options.onRedo === "function"
  );
}

/**
 * Adapter over useAdminPageActions. Prefer useAdminPageActions for new code.
 */
export function useAdminFormState(
  options?: PageActions & {
    ownerKey?: string;
    scope?: string;
    priority?: number;
    entityId?: string;
    enabled?: boolean;
  },
) {
  const reactId = useId();
  const ownerKey = options?.ownerKey ?? (hasActionableHandlers(options) ? `form-state:${reactId.replace(/:/g, "")}` : undefined);

  const result = useAdminPageActions(
    ownerKey && hasActionableHandlers(options)
      ? {
          ...options,
          ownerKey,
          scope: options?.scope ?? ownerKey,
          priority: options?.priority ?? 0,
          entityId: options?.entityId,
          enabled: options?.enabled,
        }
      : undefined,
  );

  return {
    markUnsaved: result.markUnsaved,
    markSaved: result.markSaved,
    setSaveStatus: result.setSaveStatus,
  };
}
