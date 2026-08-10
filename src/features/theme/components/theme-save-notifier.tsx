"use client";

import { useEffect, useRef } from "react";
import { useAdminForm } from "@/components/admin/layout/admin-form-provider";
import { useAdminUiStore } from "@/stores/admin-ui-store";

export function ThemeSaveNotifier() {
  const saveStatus = useAdminUiStore((s) => s.saveStatus);
  const adminForm = useAdminForm();
  const prev = useRef(saveStatus);

  useEffect(() => {
    if (prev.current === "saving" && saveStatus === "saved") {
      adminForm.showToast("Theme draft saved", "success");
    }
    if (prev.current === "saving" && saveStatus === "error") {
      adminForm.showToast("Failed to save theme draft", "error");
    }
    prev.current = saveStatus;
  }, [saveStatus, adminForm]);

  return null;
}
