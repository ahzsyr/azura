"use client";

import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import { $footerIsDirty, markFooterSaved } from "@/features/footer/footer-store";
import { saveFooterWorkspaceToServer } from "@/features/footer/footer-workspace-api";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";

export function FooterDirtySync() {
  const isDirty = useStore($footerIsDirty);
  const adminForm = useAdminFormOptional();

  useEffect(() => {
    adminForm?.setDirty(isDirty);
  }, [isDirty, adminForm]);

  return null;
}

export function useFooterWorkspaceSave() {
  const adminForm = useAdminFormOptional();

  return useCallback(async () => {
    const r = await saveFooterWorkspaceToServer();
    if (r.ok) {
      markFooterSaved();
      adminForm?.showToast("Footer saved.", "success");
    } else {
      adminForm?.showToast(r.error ?? "Save failed.", "error");
      throw new Error(r.error ?? "Save failed");
    }
  }, [adminForm]);
}

export function FooterWorkspaceActions() {
  return null;
}
