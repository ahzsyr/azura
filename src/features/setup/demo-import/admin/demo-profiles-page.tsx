"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  FileJson,
  Pencil,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteCustomDemoProfileAction,
  exportDemoProfileAction,
} from "@/features/setup/demo-import/actions";
import type { DemoProfileListItem } from "@/features/setup/demo-import/types";
import type { ProfileId } from "@/features/setup/demo-import/profile-id";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplyDemoDialog } from "./apply-demo-dialog";
import { DuplicateDemoDialog } from "./duplicate-demo-dialog";
import { ExportSiteDialog } from "./export-site-dialog";
import { ImportDemoDialog } from "./import-demo-dialog";

type Props = {
  profiles: DemoProfileListItem[];
  lastApplied: { profileId: string; displayName: string; appliedAt: string } | null;
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

export function DemoProfilesPage({ profiles, lastApplied }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [applyTarget, setApplyTarget] = useState<DemoProfileListItem | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<DemoProfileListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemoProfileListItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportSiteOpen, setExportSiteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  function handleExport(profile: DemoProfileListItem) {
    setActionError(null);
    startTransition(async () => {
      const result = await exportDemoProfileAction(profile.id as ProfileId);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      if (result.data) {
        downloadJson(result.data.filename, result.data.json);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteCustomDemoProfileAction(deleteTarget.slug);
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Demo Profiles"
        description="Manage demo website templates — apply to the live site, export, import, duplicate, or edit custom bundles."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExportSiteOpen(true)}>
              <FileJson className="mr-2 h-4 w-4" />
              Export current site
            </Button>
          </>
        }
      />

      {lastApplied && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Last applied: </span>
          <span className="font-medium">{lastApplied.displayName}</span>
          <span className="text-muted-foreground">
            {" "}
            — {new Date(lastApplied.appliedAt).toLocaleString()}
          </span>
        </div>
      )}

      {actionError && <p className="text-destructive text-sm">{actionError}</p>}
      {applyFeedback && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {applyFeedback}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base leading-snug">{profile.displayName}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {profile.description || profile.tagline}
                  </CardDescription>
                </div>
                <Badge variant={profile.source === "builtin" ? "secondary" : "outline"}>
                  {profile.source === "builtin" ? "Built-in" : "Custom"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="mt-auto space-y-4">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{profile.pageCount} pages</span>
                <span>Preset: {profile.presetId}</span>
                {profile.updatedAt && (
                  <span>Updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setApplyTarget(profile)}
                  disabled={pending}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(profile)}
                  disabled={pending}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDuplicateTarget(profile)}
                  disabled={pending}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/admin/demo-profiles/${profile.slug}`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {profile.editable ? "Edit" : "View"}
                  </Link>
                </Button>
                {profile.deletable ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(profile)}
                    disabled={pending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Built-in profiles cannot be deleted"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ApplyDemoDialog
        open={!!applyTarget}
        onOpenChange={(open) => !open && setApplyTarget(null)}
        profileId={(applyTarget?.id ?? null) as ProfileId | null}
        displayName={applyTarget?.displayName ?? ""}
        onApplied={(message) => {
          setApplyFeedback(message);
          setActionError(null);
        }}
      />

      <DuplicateDemoDialog
        key={duplicateTarget?.id ?? "closed"}
        open={!!duplicateTarget}
        onOpenChange={(open) => !open && setDuplicateTarget(null)}
        sourceId={(duplicateTarget?.id ?? null) as ProfileId | null}
        sourceName={duplicateTarget?.displayName ?? ""}
      />

      <ImportDemoDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportSiteDialog open={exportSiteOpen} onOpenChange={setExportSiteOpen} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete custom profile</DialogTitle>
            <DialogDescription>
              Remove &ldquo;{deleteTarget?.displayName}&rdquo; from the profile library. This does
              not affect the live site.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-destructive text-sm">{actionError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
