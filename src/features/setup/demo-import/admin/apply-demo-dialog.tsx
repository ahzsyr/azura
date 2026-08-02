"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyDemoProfileAction,
  getDemoApplyPreviewAction,
} from "@/features/setup/demo-import/actions";
import type { DemoApplyPreview } from "@/features/setup/demo-import/types";
import type { ProfileId } from "@/features/setup/demo-import/profile-id";
import { Button } from "@/components/ui/button";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: ProfileId | null;
  displayName: string;
  onApplied?: (message: string) => void;
};

export function ApplyDemoDialog({
  open,
  onOpenChange,
  profileId,
  displayName,
  onApplied,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<DemoApplyPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");

  useEffect(() => {
    if (!open || !profileId) return;

    let cancelled = false;
    void getDemoApplyPreviewAction(profileId).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setPreview(result.data ?? null);
      setError(null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, profileId]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPreview(null);
      setError(null);
      setConfirmPhrase("");
      setSiteName("");
      setTagline("");
    }
    onOpenChange(next);
  }

  function handleApply() {
    if (!profileId) return;
    setError(null);
    startTransition(async () => {
      const overrides =
        siteName.trim() || tagline.trim()
          ? {
              ...(siteName.trim() ? { siteName: siteName.trim() } : {}),
              ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
            }
          : undefined;

      const result = await applyDemoProfileAction({
        profileId,
        confirmPhrase,
        overrides,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onApplied?.(
        "Demo profile applied. Public pages will update shortly. Search index rebuilds in the background.",
      );
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply demo profile</DialogTitle>
          <DialogDescription>
            This will replace demo-scoped content on the live site. Admin accounts and system
            settings are preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p>
            Profile: <span className="font-medium">{displayName}</span>
          </p>

          {preview && (
            <>
              <div>
                <p className="font-medium mb-1">Pages to publish ({preview.pageSlugs.length})</p>
                <ul className="list-disc pl-5 text-muted-foreground max-h-24 overflow-y-auto">
                  {preview.pageSlugs.map((slug) => (
                    <li key={slug}>{slug}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-medium mb-1">Content that will be wiped</p>
                <ul className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <li>Posts: {preview.wipeCounts.posts}</li>
                  <li>Forms: {preview.wipeCounts.forms}</li>
                  <li>FAQs: {preview.wipeCounts.faqs}</li>
                  <li>Testimonials: {preview.wipeCounts.testimonials}</li>
                  <li>Galleries: {preview.wipeCounts.galleries}</li>
                  <li>Content items: {preview.wipeCounts.contentItems}</li>
                  <li>Media assets: {preview.wipeCounts.mediaAssets}</li>
                </ul>
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-site-name">Site name override (optional)</Label>
              <Input
                id="apply-site-name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Leave blank to use profile default"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-tagline">Tagline override (optional)</Label>
              <Input
                id="apply-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Leave blank to use profile default"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-confirm">Type APPLY to confirm</Label>
            <Input
              id="apply-confirm"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="APPLY"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleApply}
            disabled={pending || confirmPhrase.trim().toUpperCase() !== "APPLY"}
          >
            {pending ? "Applying…" : "Apply to site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
