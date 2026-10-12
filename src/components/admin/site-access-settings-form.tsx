"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { SettingsSection, ToggleField } from "@/components/admin/settings-fields";
import { updateSiteAccessSettings } from "@/features/coming-soon/actions/update-site-access-settings";
import { COMING_SOON_PATH } from "@/features/coming-soon/coming-soon.constants";
import { resetSetupWizardAction } from "@/features/setup/actions/reset-setup-wizard";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type Props = {
  comingSoonEnabled: boolean;
  envOverride: boolean | null;
  setupCompleteLocked?: boolean;
};

async function downloadSiteBackup(): Promise<void> {
  const response = await fetch("/api/admin/site-backup", { method: "POST" });
  if (!response.ok) {
    let message = "Backup failed.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Response was not JSON.
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `azura-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SiteAccessSettingsForm({
  comingSoonEnabled: initial,
  envOverride,
  setupCompleteLocked = false,
}: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [savedEnabled, setSavedEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [backupPending, setBackupPending] = useState(false);
  const [backupBeforeReset, setBackupBeforeReset] = useState(true);

  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  useEffect(() => {
    setEnabled(initial);
    setSavedEnabled(initial);
  }, [initial]);

  const persistComingSoon = useCallback(
    async (value: boolean) => {
      setError(null);
      setFeedback(null);
      setSaveStatus("saving");
      const result = await updateSiteAccessSettings({ comingSoonEnabled: value });
      if (!result.success) {
        setError(result.error);
        setSaveStatus("error");
        setEnabled(savedEnabled);
        return false;
      }
      setEnabled(value);
      setSavedEnabled(value);
      setFeedback(
        value
          ? "Coming soon mode is on. Public visitors only see the coming soon page."
          : "Coming soon mode is off. The site is live for visitors.",
      );
      markSaved();
      router.refresh();
      return true;
    },
    [markSaved, router, savedEnabled, setSaveStatus],
  );

  const patchEnabled = useCallback(
    (value: boolean) => {
      setEnabled(value);
      void persistComingSoon(value);
    },
    [persistComingSoon],
  );

  const handleSave = useCallback(async () => {
    return persistComingSoon(enabled);
  }, [enabled, persistComingSoon]);

  const handleCancel = useCallback(() => {
    setEnabled(savedEnabled);
    setError(null);
    setFeedback(null);
  }, [savedEnabled]);

  const runBackupDownload = useCallback(async () => {
    setBackupPending(true);
    try {
      await downloadSiteBackup();
    } finally {
      setBackupPending(false);
    }
  }, []);

  const handleResetSetup = useCallback(async () => {
    setResetError(null);
    setResetPending(true);
    try {
      if (backupBeforeReset) {
        await downloadSiteBackup();
      }
    } catch (error) {
      setResetPending(false);
      setResetError(error instanceof Error ? error.message : "Backup failed. Reset was not run.");
      return;
    }
    const result = await resetSetupWizardAction({ confirmText: resetConfirmText });
    setResetPending(false);
    if (!result.success) {
      setResetError(result.error);
      return;
    }
    const redirectTo = result.data?.redirectTo ?? "/setup";
    setResetDialogOpen(false);
    setResetConfirmText("");
    router.push(redirectTo);
    router.refresh();
  }, [backupBeforeReset, resetConfirmText, router]);

  useAdminPageActions({
    ownerKey: "site-access-settings",
    scope: "settings",
    priority: 0,
    onSave: handleSave,
    onCancel: handleCancel,
    saveStatusMode: "self-managed",
  });

  const hasEnvFallback = envOverride !== null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Site access"
        description="Control whether public visitors can browse the site or see the coming soon page. The setting applies immediately and is enforced by the server."
      />

      {feedback ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Public visibility</CardTitle>
          <CardDescription>
            When enabled, visitors are redirected to the coming soon page and public APIs return
            unavailable responses. Admin routes stay accessible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={savedEnabled ? "default" : "secondary"}>
              {savedEnabled ? (
                <>
                  <EyeOff className="me-1 size-3.5" aria-hidden />
                  Hidden from visitors
                </>
              ) : (
                <>
                  <Eye className="me-1 size-3.5" aria-hidden />
                  Live for visitors
                </>
              )}
            </Badge>
            {hasEnvFallback ? (
              <Badge variant="outline">
                COMING_SOON_ENABLED fallback={envOverride ? "true" : "false"} (API failure only)
              </Badge>
            ) : null}
          </div>
          {envOverride === true && !savedEnabled ? (
            <p className="text-muted-foreground text-sm">
              The site is saved as live. Visitors only see Coming Soon if{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">/api/setup/status</code>{" "}
              is unreachable and{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">COMING_SOON_ENABLED=true</code>{" "}
              is set. Remove that env var after launch, or set it to false.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <SettingsSection
            title="Coming soon page"
            description="Use this while building the site. Signed-in admins can still browse the full storefront for preview."
          >
            <ToggleField
              label="Show coming soon page to visitors"
              description={
                hasEnvFallback
                  ? "Applies immediately. Middleware uses this saved value whenever /api/setup/status responds. COMING_SOON_ENABLED env applies only if that API is unreachable."
                  : "Applies immediately. Redirects public pages to /coming-soon and blocks public API access while enabled."
              }
              checked={enabled}
              onChange={patchEnabled}
            />
          </SettingsSection>

          <SettingsSection
            title="Preview"
            description="Open the public coming soon page or continue working in admin."
          >
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={COMING_SOON_PATH} target="_blank" rel="noopener noreferrer">
                  View coming soon page
                  <ExternalLink className="ms-2 size-3.5" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">Back to dashboard</Link>
              </Button>
            </div>
          </SettingsSection>

        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Reset setup</CardTitle>
          <CardDescription>
            Remove website content, catalog data, uploaded media, and admin accounts, then return
            to the setup wizard. Visitors see the coming soon page until setup is completed again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {setupCompleteLocked ? (
            <p className="text-sm text-destructive">
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">SETUP_COMPLETE=true</code>{" "}
              is set in the environment. Remove that variable or reset will not stay incomplete for
              visitors.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={backupPending || resetPending}
              onClick={() => {
                setResetError(null);
                void runBackupDownload().catch((error: unknown) => {
                  setResetError(error instanceof Error ? error.message : "Backup failed.");
                });
              }}
            >
              {backupPending ? "Preparing backup…" : "Download backup"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={backupPending || resetPending}
              onClick={() => {
                setResetError(null);
                setResetConfirmText("");
                setResetDialogOpen(true);
              }}
            >
              Reset website setup
            </Button>
          </div>
          {resetError && !resetDialogOpen ? (
            <p className="text-sm text-destructive">{resetError}</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset setup wizard?</DialogTitle>
            <DialogDescription>
              This deletes website content, catalog data, uploaded media, and all user accounts.
              You will need to run the setup wizard again. Type RESET to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={backupBeforeReset}
                disabled={resetPending}
                onChange={(event) => setBackupBeforeReset(event.target.checked)}
              />
              <span>Download a backup of the database and website media before reset</span>
            </label>
            <Label htmlFor="reset-confirm">Confirmation</Label>
            <Input
              id="reset-confirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
              disabled={resetPending}
            />
            {resetError ? (
              <p className="text-sm text-destructive">{resetError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleResetSetup()}
              disabled={resetPending || resetConfirmText.trim().toUpperCase() !== "RESET"}
            >
              {resetPending ? (backupBeforeReset ? "Backing up and resetting…" : "Resetting…") : "Reset setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
