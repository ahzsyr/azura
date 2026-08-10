"use client";

import { useCallback, useEffect } from "react";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import type { ShellEntityType } from "@/services/publish-propagation";
import { fetchSiteSettingsPublishStatus, publishShell } from "@/lib/publish-shell.client";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";

type Options = {
  onSave: () => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
  publishLabel?: string;
  canPublish?: boolean;
  enabled?: boolean;
  /** Shell entity published by onPublish when onPublish is omitted. */
  publishEntityType?: ShellEntityType;
  /** Locale for site-settings publish status API. */
  locale?: string;
  /** Load publish status on mount (site-settings pages). */
  loadPublishStatus?: boolean;
};

/** Registers Save/Publish/Cancel in the admin top bar for Design Hub settings panels. */
export function useDesignHubSettingsActions({
  onSave,
  onPublish,
  onCancel,
  saveLabel,
  publishLabel,
  canPublish = true,
  enabled = true,
  publishEntityType,
  locale = adminLocale.code,
  loadPublishStatus = false,
}: Options) {
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markPublishPending = useAdminUiStore((s) => s.markPublishPending);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const setPublishStatus = useAdminUiStore((s) => s.setPublishStatus);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await onSave();
      markSaved();
      markPublishPending();
    } catch {
      setSaveStatus("error");
    }
  }, [onSave, markSaved, markPublishPending, setSaveStatus]);

  const handlePublish = useCallback(async () => {
    if (onPublish) {
      await onPublish();
    } else if (publishEntityType) {
      await publishShell(publishEntityType, locale);
    } else {
      throw new Error("No publish handler configured");
    }
  }, [onPublish, publishEntityType, locale]);

  useEffect(() => {
    if (!loadPublishStatus) return;
    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchSiteSettingsPublishStatus(locale);
        if (cancelled) return;
        if (status.isLive) {
          setPublishStatus("live");
        } else {
          setPublishStatus("pending");
        }
      } catch {
        /* keep current status */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPublishStatus, locale, setPublishStatus]);

  useEffect(() => {
    if (!enabled) {
      clearPageActions();
      return;
    }
    registerPageActions({
      onSave: handleSave,
      onPublish: handlePublish,
      onCancel,
      selfManagedSaveStatus: true,
      saveLabel,
      publishLabel,
      canPublish,
    });
    return () => clearPageActions();
  }, [
    enabled,
    registerPageActions,
    clearPageActions,
    handleSave,
    handlePublish,
    onCancel,
    saveLabel,
    publishLabel,
    canPublish,
  ]);

  return { markDirty: markUnsaved };
}

/** @deprecated Use useDesignHubSettingsActions */
export const useDesignHubSaveActions = useDesignHubSettingsActions;
