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
import { useAdminUiStore } from "@/stores/admin-ui-store";

type Props = {
  comingSoonEnabled: boolean;
  envOverride: boolean | null;
};

export function SiteAccessSettingsForm({ comingSoonEnabled: initial, envOverride }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [savedEnabled, setSavedEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);

  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const patchEnabled = useCallback(
    (value: boolean) => {
      markUnsaved();
      setEnabled(value);
    },
    [markUnsaved],
  );

  const handleSave = useCallback(async () => {
    setError(null);
    setFeedback(null);
    setSaveStatus("saving");
    const result = await updateSiteAccessSettings({ comingSoonEnabled: enabled });
    if (!result.success) {
      setError(result.error);
      setSaveStatus("error");
      return false;
    }
    setSavedEnabled(enabled);
    setFeedback(
      enabled
        ? "Coming soon mode is on. Public visitors only see the coming soon page."
        : "Coming soon mode is off. The site is live for visitors.",
    );
    markSaved();
  }, [enabled, markSaved, setSaveStatus]);

  const handleCancel = useCallback(() => {
    setEnabled(savedEnabled);
    setError(null);
    setFeedback(null);
  }, [savedEnabled]);

  const handleResetSetup = useCallback(async () => {
    setResetError(null);
    setResetPending(true);
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
  }, [resetConfirmText, router]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  const envLocked = envOverride !== null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Site access"
        description="Hide the public site behind a coming soon page while you develop or prepare for launch."
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
        <CardContent className="flex flex-wrap items-center gap-2 pt-0">
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? (
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
          {envLocked ? (
            <Badge variant="outline">
              Locked by COMING_SOON_ENABLED={envOverride ? "true" : "false"}
            </Badge>
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
                envLocked
                  ? "This toggle is overridden by the COMING_SOON_ENABLED environment variable."
                  : "Redirects all public pages to /coming-soon and blocks public API access."
              }
              checked={envLocked ? envOverride === true : enabled}
              onChange={patchEnabled}
              disabled={envLocked}
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

          <SettingsSection
            title="Developer bypass (optional)"
            description="Set COMING_SOON_BYPASS_SECRET in your environment, then visit any URL with ?bypass=YOUR_SECRET to preview the full site in your browser without signing in."
          >
            <p className="text-muted-foreground text-sm">
              Example:{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                /?bypass=your-secret
              </code>
            </p>
          </SettingsSection>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Reset setup</CardTitle>
          <CardDescription>
            Clear setup completion, remove admin accounts, and return to the setup wizard. CMS
            content and catalog data are kept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setResetError(null);
              setResetConfirmText("");
              setResetDialogOpen(true);
            }}
          >
            Reset website setup
          </Button>
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset setup wizard?</DialogTitle>
            <DialogDescription>
              This deletes all admin users and marks setup as incomplete. You will need to run the
              setup wizard again to create a new admin account. Type RESET to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
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
              {resetPending ? "Resetting…" : "Reset setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
