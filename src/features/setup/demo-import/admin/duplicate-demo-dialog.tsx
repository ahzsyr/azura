"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateDemoProfileAction } from "@/features/setup/demo-import/actions";
import { slugifyProfileName } from "@/features/setup/demo-import/profile-id";
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
  sourceId: ProfileId | null;
  sourceName: string;
};

export function DuplicateDemoDialog({ open, onOpenChange, sourceId, sourceName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(() => slugifyProfileName(`${sourceName}-copy`));
  const [name, setName] = useState(() => `${sourceName} (Copy)`);
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    if (!sourceId) return;
    setError(null);
    startTransition(async () => {
      const result = await duplicateDemoProfileAction(sourceId, slug, name);
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
          <DialogTitle>Duplicate profile</DialogTitle>
          <DialogDescription>
            Create an editable copy of &ldquo;{sourceName}&rdquo; in your custom profile library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dup-name">Display name</Label>
            <Input
              id="dup-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug || slug === slugifyProfileName(`${sourceName}-copy`)) {
                  setSlug(slugifyProfileName(e.target.value));
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dup-slug">Slug</Label>
            <Input
              id="dup-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-agency-copy"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={pending || !slug.trim()}>
            {pending ? "Duplicating…" : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
