"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { UnifiedMediaPickerDialog } from "@/features/media/components/unified-media-picker-dialog";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { CATALOG_NAV_LUCIDE_OPTIONS } from "@/features/catalog/navigation/catalog-nav-lucide";

export { CATALOG_NAV_LUCIDE_OPTIONS } from "@/features/catalog/navigation/catalog-nav-lucide";

type Props = {
  iconType: "lucide" | "image";
  icon: string;
  onIconTypeChange: (type: "lucide" | "image") => void;
  onIconChange: (icon: string) => void;
};

export function NavItemIconFields({
  iconType,
  icon,
  onIconTypeChange,
  onIconChange,
}: Props) {
  const fileInputId = useId().replace(/:/g, "_");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setBusy(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/catalog-media/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; item?: { url?: string }; error?: string };
      if (!res.ok) throw new Error(json.error || "Upload failed");
      const url = json.url ?? json.item?.url;
      if (!url) throw new Error("No URL returned");
      onIconTypeChange("image");
      onIconChange(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Icon type</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={iconType === "lucide" ? "default" : "outline"}
            onClick={() => {
              onIconTypeChange("lucide");
              if (!icon || icon.startsWith("/") || icon.startsWith("http")) {
                onIconChange("layers");
              }
            }}
          >
            Lucide icon
          </Button>
          <Button
            type="button"
            size="sm"
            variant={iconType === "image" ? "default" : "outline"}
            onClick={() => onIconTypeChange("image")}
          >
            Image
          </Button>
        </div>
      </div>

      {iconType === "lucide" ? (
        <div>
          <Label className="text-xs">Choose icon</Label>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border/60 p-1.5">
            <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
              {CATALOG_NAV_LUCIDE_OPTIONS.map(({ id, label, Icon }) => {
                const selected = icon.trim().toLowerCase() === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => onIconChange(id)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-[9px] leading-tight transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.5} />
                    <span className="w-full truncate text-center">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2">
            <Label className="text-xs">Or enter Lucide name</Label>
            <Input
              className="mt-1"
              value={icon}
              onChange={(e) => onIconChange(e.target.value)}
              placeholder="wifi, camera, layers…"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs">Icon image</Label>
          {icon ? (
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon} alt="" className="size-8 object-contain" />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{icon}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => onIconChange("")}>
                Clear
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`nav-icon-file-${fileInputId}`}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadFile(f);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                document.getElementById(`nav-icon-file-${fileInputId}`)?.click()
              }
            >
              {busy ? "Uploading…" : "Upload image"}
            </Button>
            <UnifiedMediaPickerDialog
              mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
              defaultSource="cms"
              onSelect={(result) => {
                onIconTypeChange("image");
                onIconChange(result.url);
              }}
              trigger={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                >
                  Choose from Media
                </Button>
              }
            />
          </div>
          {uploadError ? (
            <p className="text-xs text-destructive">{uploadError}</p>
          ) : null}
          <div>
            <Label className="text-xs">Or paste image URL</Label>
            <Input
              className="mt-1"
              value={icon}
              onChange={(e) => {
                onIconTypeChange("image");
                onIconChange(e.target.value);
              }}
              placeholder="/media/... or https://..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
