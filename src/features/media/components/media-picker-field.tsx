"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { MediaType } from "@prisma/client";
import { Link2, Upload, X } from "lucide-react";
import {
  UnifiedMediaPickerDialog,
  UnifiedMediaPickerTriggerButton,
  type UnifiedMediaPickResult,
} from "./unified-media-picker-dialog";
import { MediaFieldUploadButton } from "./media-field-upload-button";
import {
  DEFAULT_MEDIA_PLACEHOLDER,
  hasMediaUrl,
  IMAGE_PICKER_MEDIA_TYPES,
  resolveMediaUrl,
} from "@/features/media/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  initialMediaPickerMode,
  type MediaPickerSourceMode,
} from "@/features/media/lib/media-picker-mode";

type Props = {
  label?: string;
  hint?: string;
  /** Media asset ID (hidden field name) */
  idFieldName?: string;
  /** URL field name for legacy forms */
  urlFieldName?: string;
  mediaId?: string | null;
  url?: string;
  mediaTypes?: MediaType[];
  onChange: (value: { mediaId: string | null; url: string }) => void;
  className?: string;
  previewSize?: { width: number; height: number };
  /** When false, omit hidden id field even if idFieldName is set */
  trackMediaId?: boolean;
};

export function MediaPickerField({
  label = "Media",
  hint,
  idFieldName = "mediaAssetId",
  urlFieldName,
  mediaId,
  url = "",
  mediaTypes = IMAGE_PICKER_MEDIA_TYPES,
  onChange,
  className,
  previewSize,
  trackMediaId = true,
}: Props) {
  const [mode, setMode] = useState<MediaPickerSourceMode>("link");
  const [mounted, setMounted] = useState(false);
  const preview = resolveMediaUrl(url);
  const showingPlaceholder = !hasMediaUrl(url);
  const previewBox = previewSize ?? { width: 112, height: 80 };

  useEffect(() => {
    setMounted(true);
    setMode(initialMediaPickerMode(mediaId, url));
  }, [mediaId, url]);

  const handlePick = useCallback(
    (result: UnifiedMediaPickResult) => {
      setMode("upload");
      onChange({ mediaId: result.mediaId, url: result.url });
    },
    [onChange],
  );

  const handleUpload = useCallback(
    (result: { url: string; mediaId: string | null }) => {
      setMode("upload");
      onChange({ mediaId: result.mediaId, url: result.url });
    },
    [onChange],
  );

  const handleLinkChange = (nextUrl: string) => {
    onChange({ mediaId: null, url: nextUrl });
  };

  const clear = () => {
    setMode("link");
    onChange({ mediaId: null, url: "" });
  };

  const showIdField = trackMediaId && idFieldName;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {showIdField ? <input type="hidden" name={idFieldName} value={mediaId ?? ""} readOnly /> : null}
      {urlFieldName ? <input type="hidden" name={urlFieldName} value={url} readOnly /> : null}

      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cn(
            "relative rounded-lg border overflow-hidden bg-muted shrink-0",
            showingPlaceholder && "opacity-80"
          )}
          style={{ width: previewBox.width, height: previewBox.height }}
        >
          <Image
            src={preview}
            alt=""
            fill
            className={cn("object-cover", showingPlaceholder && "object-contain p-1")}
            sizes={`${previewBox.width}px`}
            unoptimized={preview === DEFAULT_MEDIA_PLACEHOLDER}
          />
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <div className="flex gap-1 rounded-lg border p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link2 className="h-3 w-3" />
              Link
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="h-3 w-3" />
              Upload
            </button>
          </div>

          {!mounted || mode === "link" ? (
            <Input
              value={url}
              onChange={(e) => handleLinkChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              name={urlFieldName ? undefined : "url"}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <MediaFieldUploadButton mediaTypes={mediaTypes} onComplete={handleUpload} />
              <UnifiedMediaPickerDialog
                mediaTypes={mediaTypes}
                onSelect={handlePick}
                trigger={<UnifiedMediaPickerTriggerButton label="Media library" />}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(url || mediaId) && (
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                <X className="h-4 w-4 me-1" />
                Clear
              </Button>
            )}
            {mounted && mediaId ? (
              <p className="text-[10px] text-muted-foreground font-mono truncate">ID: {mediaId}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
