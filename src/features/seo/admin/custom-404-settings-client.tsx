"use client";

import { useCallback, useRef } from "react";
import { upsertCustom404Action } from "@/features/seo/actions";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";

type Props = {
  custom404Id: string;
  defaultLocaleCode: string;
  legacyEntity: Record<string, string>;
};

export function Custom404SettingsClient({ custom404Id, defaultLocaleCode, legacyEntity }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const savingRef = useRef(false);

  const handleSave = useCallback(async () => {
    const form = formRef.current;
    if (!form || savingRef.current) return false;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const fd = new FormData(form);
      fd.set("locale", defaultLocaleCode);
      fd.set("blocks", "[]");
      await runAdminAction(
        "Saving 404 page…",
        () => upsertCustom404Action(fd),
        "404 page saved.",
      );
      markSaved();
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [defaultLocaleCode, markSaved, setSaveStatus]);

  const handleCancel = useCallback(() => {
    formRef.current?.reset();
  }, []);

  useAdminPageActions({
    ownerKey: "seo-custom-404",
    scope: "settings",
    priority: 0,
    onSave: handleSave,
    onCancel: handleCancel,
    saveStatusMode: "self-managed",
  });

  return (
    <div className="space-y-8 max-w-xl">
      <h1 className="text-2xl font-bold">404 Page Manager</h1>
      <p className="text-sm text-muted-foreground">
        Edit title and body per locale using the language switcher in the admin header.
      </p>

      <form ref={formRef} className="border rounded-lg p-4 space-y-4">
        <AdminLocalizedFormField
          fieldKey="title"
          label="Title"
          entityType="Custom404"
          entityId={custom404Id}
          legacyEntity={legacyEntity}
          required
        />
        <AdminLocalizedFormField
          fieldKey="body"
          label="Body"
          entityType="Custom404"
          entityId={custom404Id}
          legacyEntity={legacyEntity}
          multiline
          rows={3}
          required
        />
      </form>
    </div>
  );
}
