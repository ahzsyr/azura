"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Play } from "lucide-react";
import {
  exportDemoProfileAction,
  saveCustomDemoProfileAction,
} from "@/features/setup/demo-import/actions";
import type { ProfileId } from "@/features/setup/demo-import/profile-id";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApplyDemoDialog } from "./apply-demo-dialog";

type Props = {
  profileId: ProfileId;
  slug: string;
  displayName: string;
  initialJson: string;
  readOnly: boolean;
};

function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DemoProfileEditor({
  profileId,
  slug,
  displayName,
  initialJson,
  readOnly,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [json, setJson] = useState(initialJson);
  const [savedJson, setSavedJson] = useState(initialJson);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const handleSave = useCallback(async () => {
    setError(null);
    setStatus(null);
    setSaveStatus("saving");
    const result = await saveCustomDemoProfileAction(slug, json);
    if (!result.success) {
      setError(result.error);
      setSaveStatus("error");
      return false;
    }
    setSavedJson(json);
    setStatus("Profile saved.");
    markSaved();
    router.refresh();
    return true;
  }, [json, markSaved, router, setSaveStatus, slug]);

  const handleCancel = useCallback(() => {
    setJson(savedJson);
    setError(null);
    setStatus(null);
  }, [savedJson]);

  useEffect(() => {
    if (readOnly) {
      clearPageActions();
      return;
    }
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [readOnly, registerPageActions, clearPageActions, handleSave, handleCancel]);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportDemoProfileAction(profileId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        downloadJson(result.data.filename, result.data.json);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={displayName}
        description={
          readOnly
            ? "Built-in profile — read-only. Duplicate to create an editable copy."
            : "Edit the profile JSON bundle. Validate on save."
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/demo-profiles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setApplyOpen(true)} disabled={pending}>
              <Play className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </>
        }
      />

      {readOnly && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          This is a built-in profile and cannot be edited directly. Use{" "}
          <strong>Duplicate</strong> from the list page to create a customizable copy.
        </div>
      )}

      {status && <p className="text-sm text-emerald-600">{status}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <Textarea
        value={json}
        onChange={(e) => {
          setJson(e.target.value);
          if (!readOnly) markUnsaved();
        }}
        readOnly={readOnly}
        rows={28}
        className="font-mono text-xs leading-relaxed"
        spellCheck={false}
      />

      <ApplyDemoDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        profileId={profileId}
        displayName={displayName}
      />
    </div>
  );
}
