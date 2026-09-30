"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useRegisterAdminPageConfig } from "@/components/admin/layout/admin-page-config-provider";
import { ADMIN_PAGE_CONFIGS } from "@/config/admin-page-configs";
import type { AdminPageConfig } from "@/config/admin-page-config";
import { useAdminUiStore } from "@/stores/admin-ui-store";

const SAVE_FORM_ATTR = "data-admin-save-form";

function resolveTargetForm(formId?: string, formSelector?: string): HTMLFormElement | null {
  if (typeof document === "undefined") return null;

  const active = document.activeElement;
  if (active instanceof Element) {
    const focused = active.closest(`form[${SAVE_FORM_ATTR}]`) as HTMLFormElement | null;
    if (focused) return focused;
  }

  if (formId) {
    const byId = document.getElementById(formId) as HTMLFormElement | null;
    if (byId) return byId;
  }

  if (formSelector) {
    return document.querySelector(formSelector) as HTMLFormElement | null;
  }

  return document.querySelector(`form[${SAVE_FORM_ATTR}]`) as HTMLFormElement | null;
}

/**
 * Registers top-bar Save/Cancel for server-rendered (or client) forms.
 * Prefer a single formId, or mark forms with data-admin-save-form for multi-form pages
 * (Save submits the focused form, else primary formId / first matching form).
 */
export function AdminServerFormTopBarActions({
  formId,
  formSelector,
  ownerKey,
  config = ADMIN_PAGE_CONFIGS.settingsSaveOnly,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  enableCancel = true,
}: {
  /** Primary / fallback form id */
  formId?: string;
  /** CSS selector for saveable forms (default: form[data-admin-save-form]) */
  formSelector?: string;
  ownerKey: string;
  config?: AdminPageConfig;
  saveLabel?: string;
  cancelLabel?: string;
  enableCancel?: boolean;
}) {
  useRegisterAdminPageConfig(config);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const rootRef = useRef<Document | null>(null);

  useEffect(() => {
    rootRef.current = document;
    const selector = formSelector ?? (formId ? `#${CSS.escape(formId)}` : `form[${SAVE_FORM_ATTR}]`);

    const onDirty = (e: Event) => {
      const target = e.target as Element | null;
      if (!target?.closest?.(selector) && !(formId && target?.closest?.(`#${CSS.escape(formId)}`))) {
        // Also accept any data-admin-save-form
        if (!target?.closest?.(`form[${SAVE_FORM_ATTR}]`)) return;
      }
      markUnsaved();
    };

    document.addEventListener("input", onDirty, true);
    document.addEventListener("change", onDirty, true);
    return () => {
      document.removeEventListener("input", onDirty, true);
      document.removeEventListener("change", onDirty, true);
    };
  }, [formId, formSelector, markUnsaved]);

  const handleSave = useCallback(() => {
    const form = resolveTargetForm(formId, formSelector ?? `form[${SAVE_FORM_ATTR}]`);
    if (!form) {
      console.warn("[Admin Action System] No form found for Save", { formId, formSelector, ownerKey });
      return false;
    }
    form.requestSubmit();
    return true;
  }, [formId, formSelector, ownerKey]);

  const handleCancel = useCallback(() => {
    const forms = formId
      ? ([document.getElementById(formId)].filter(Boolean) as HTMLFormElement[])
      : Array.from(
          document.querySelectorAll<HTMLFormElement>(
            formSelector ?? `form[${SAVE_FORM_ATTR}]`,
          ),
        );
    for (const form of forms) {
      form.reset();
    }
    markSaved();
  }, [formId, formSelector, markSaved]);

  useAdminPageActions({
    ownerKey,
    scope: "settings",
    priority: 0,
    onSave: handleSave,
    saveLabel,
    canSave: true,
    onCancel: enableCancel ? handleCancel : undefined,
    cancelLabel,
    canCancel: enableCancel ? true : undefined,
    saveStatusMode: "automatic",
  });

  return null;
}
