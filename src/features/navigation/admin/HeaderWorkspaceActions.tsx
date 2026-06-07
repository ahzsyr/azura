"use client";

import { useCallback } from "react";
import { Download, Upload } from "lucide-react";
import { applyImportedPayload, exportWorkspaceBlob, markWorkspaceSaved } from "@/features/navigation/header-store";
import { saveWorkspaceToServer } from "@/features/navigation/header-workspace-api";
import { Button } from "@/components/ui/button";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";

export function HeaderWorkspaceActions() {
  const adminForm = useAdminFormOptional();

  const exportAll = () => {
    const blob = exportWorkspaceBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "full_workspace.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importAll = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          applyImportedPayload(parsed);
          const r = await saveWorkspaceToServer();
          if (r.ok) {
            markWorkspaceSaved();
            adminForm?.setDirty(false);
            adminForm?.showToast("Workspace imported and saved.", "success");
          } else {
            adminForm?.showToast(r.error ?? "Import failed to save.", "error");
          }
        } catch {
          adminForm?.showToast("Invalid JSON file.", "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={importAll}>
        <Upload className="h-4 w-4" />
        Import JSON
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={exportAll}>
        <Download className="h-4 w-4" />
        Export All
      </Button>
    </div>
  );
}

export function useHeaderWorkspaceSave() {
  const adminForm = useAdminFormOptional();

  return useCallback(async () => {
    const r = await saveWorkspaceToServer();
    if (r.ok) {
      markWorkspaceSaved();
      adminForm?.showToast("Header workspace saved.", "success");
    } else {
      adminForm?.showToast(r.error ?? "Save failed.", "error");
      throw new Error(r.error ?? "Save failed");
    }
  }, [adminForm]);
}
