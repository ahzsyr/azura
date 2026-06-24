"use client";

import { useCallback, useEffect } from "react";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type Options = {
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
  enabled?: boolean;
};

/** Registers Save/Cancel in the admin top bar for Design Hub settings panels. */
export function useDesignHubSaveActions({
  onSave,
  onCancel,
  saveLabel,
  enabled = true,
}: Options) {
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await onSave();
      markSaved();
    } catch {
      setSaveStatus("error");
    }
  }, [onSave, markSaved, setSaveStatus]);

  useEffect(() => {
    if (!enabled) {
      clearPageActions();
      return;
    }
    registerPageActions({
      onSave: handleSave,
      onCancel,
      selfManagedSaveStatus: true,
      saveLabel,
    });
    return () => clearPageActions();
  }, [
    enabled,
    registerPageActions,
    clearPageActions,
    handleSave,
    onCancel,
    saveLabel,
  ]);

  return { markDirty: markUnsaved };
}
