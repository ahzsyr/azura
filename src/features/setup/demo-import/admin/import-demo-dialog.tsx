"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importDemoProfileBundleAction } from "@/features/setup/demo-import/actions";
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
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImportDemoDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [json, setJson] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setJson("");
    setSlug("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleImport() {
    setError(null);
    startTransition(async () => {
      const result = await importDemoProfileBundleAction(json, slug.trim() || undefined);
      if (!result.success) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      if (result.data?.slug) {
        router.push(`/admin/demo-profiles/${result.data.slug}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setJson(text);
      try {
        const parsed = JSON.parse(text) as { meta?: { displayName?: string } };
        if (parsed.meta?.displayName && !slug) {
          setSlug(slugifyProfileName(parsed.meta.displayName));
        }
      } catch {
        /* ignore parse errors until submit */
      }
    };
    reader.readAsText(file);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import demo profile</DialogTitle>
          <DialogDescription>
            Paste or upload a profile JSON bundle. It will be saved to your library without
            applying to the live site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="import-slug">Profile slug (optional)</Label>
            <Input
              id="import-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-derived from display name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="import-json">Profile JSON</Label>
            <Textarea
              id="import-json"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder='{ "meta": { ... }, "pages": [ ... ] }'
            />
          </div>

          <div>
            <Label
              htmlFor="import-file"
              className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Choose JSON file
            </Label>
            <input
              id="import-file"
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={pending || !json.trim()}>
            {pending ? "Importing…" : "Import to library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
