"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (iconId: string) => void;
};

function slugify(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function IconUploadDialog({ open, onOpenChange, onUploaded }: Props) {
  const [name, setName] = useState("");
  const [iconId, setIconId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setIconId("");
    setFile(null);
    setError(null);
  };

  const handleNameChange = (next: string) => {
    setName(next);
    if (!iconId || iconId === slugify(name)) {
      setIconId(slugify(next));
    }
  };

  const upload = async () => {
    if (!file) {
      setError("Choose an SVG file.");
      return;
    }
    if (!iconId.trim() || !name.trim()) {
      setError("Name and iconId are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("iconId", iconId.trim());
      fd.append("name", name.trim());
      const res = await fetch("/api/icons/upload-svg", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; iconId?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onUploaded?.(json.iconId ?? iconId.trim());
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload custom SVG icon</DialogTitle>
          <DialogDescription>
            SVG is sanitized server-side before storage. Only sanitized content is rendered.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="icon-upload-name">Name</Label>
            <Input
              id="icon-upload-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My company icon"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="icon-upload-id">iconId (kebab-case)</Label>
            <Input
              id="icon-upload-id"
              value={iconId}
              onChange={(e) => setIconId(e.target.value)}
              placeholder="my-company-icon"
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="icon-upload-file">SVG file</Label>
            <Input
              id="icon-upload-file"
              type="file"
              accept=".svg,image/svg+xml"
              className="mt-1"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void upload()} disabled={busy}>
            {busy ? "Uploading…" : "Upload icon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
