"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportCurrentSiteProfileAction } from "@/features/setup/demo-import/actions";
import { slugifyProfileName } from "@/features/setup/demo-import/profile-id";
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
};

export function ExportSiteDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState("current-site");
  const [displayName, setDisplayName] = useState("Current Site Snapshot");
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportCurrentSiteProfileAction(
        slug.trim() || "current-site",
        displayName.trim() || undefined
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      if (result.data?.slug) {
        router.push(`/admin/demo-profiles/${result.data.slug}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export current site as profile</DialogTitle>
          <DialogDescription>
            Snapshot the live site (pages, theme, header/footer, sample data) as a custom demo
            profile bundle. Does not modify the live site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="export-name">Display name</Label>
            <Input
              id="export-name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setSlug(slugifyProfileName(e.target.value || "current-site"));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-slug">Profile slug</Label>
            <Input
              id="export-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={pending}>
            {pending ? "Exporting…" : "Save snapshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
